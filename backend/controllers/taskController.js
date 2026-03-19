import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const normalizeSubtasks = (subtasks = []) => {
  if (!Array.isArray(subtasks)) return [];

  return subtasks
    .map((item, index) => ({
      id: item?.id || `sub-${Date.now()}-${index}`,
      text: String(item?.text || '').trim(),
      completed: Boolean(item?.completed)
    }))
    .filter((item) => item.text.length > 0);
};

const parseJsonArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeTaskPayload = (task) => {
  const taskJson = task?.toJSON ? task.toJSON() : task;
  if (!taskJson) return taskJson;

  taskJson.assignedTo = parseJsonArrayField(taskJson.assignedTo).map(Number).filter((id) => Number.isInteger(id));
  taskJson.tags = parseJsonArrayField(taskJson.tags);
  taskJson.subtasks = normalizeSubtasks(parseJsonArrayField(taskJson.subtasks));
  taskJson.attachments = parseJsonArrayField(taskJson.attachments);
  return taskJson;
};

const reorderTasksInBoard = async (projectId, boardName, excludeTaskId = null) => {
  const where = { projectId, board: boardName };
  if (excludeTaskId) {
    where.id = { [Op.ne]: excludeTaskId };
  }

  const boardTasks = await Task.findAll({
    where,
    order: [['order', 'ASC'], ['id', 'ASC']]
  });

  for (let index = 0; index < boardTasks.length; index += 1) {
    if (boardTasks[index].order !== index) {
      boardTasks[index].order = index;
      await boardTasks[index].save();
    }
  }

  return boardTasks;
};

const canAccessProject = (project, userId) => {
  let members = project.members;
  if (typeof members === 'string') {
    try {
      members = JSON.parse(members);
    } catch {
      members = [];
    }
  }
  members = Array.isArray(members) ? members : [];
  const memberMatch = members.some((member) => Number(member?.userId ?? member?.user) === Number(userId));
  return project.ownerId === Number(userId) || memberMatch;
};

const getProjectMemberIds = (project) => {
  let members = project.members;
  if (typeof members === 'string') {
    try {
      members = JSON.parse(members);
    } catch {
      members = [];
    }
  }

  const normalized = Array.isArray(members) ? members : [];
  const memberIds = normalized
    .map((member) => Number(member?.userId ?? member?.user))
    .filter((memberId) => Number.isInteger(memberId));

  memberIds.push(Number(project.ownerId));
  return [...new Set(memberIds)];
};

const emitUserNotification = async (io, payload) => {
  const notification = await Notification.create(payload);
  io.to(String(payload.recipientId)).emit('notification', notification);
  return notification;
};

const getTaskWithRelations = async (taskId) => {
  const task = await Task.findByPk(taskId, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'avatar']
      },
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'title']
      }
    ]
  });

  return normalizeTaskPayload(task);
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      project,
      projectId,
      board,
      assignedTo,
      priority,
      dueDate,
      tags,
      subtasks
    } = req.body;
    const normalizedProjectId = Number(projectId || project);

    // Check if project exists and user is a member
    const projectDoc = await Project.findByPk(normalizedProjectId);
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!canAccessProject(projectDoc, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create tasks in this project'
      });
    }

    const normalizedAssignedTo = Array.isArray(assignedTo)
      ? [...new Set(assignedTo.map(Number).filter((userId) => Number.isInteger(userId)))]
      : [];

    if (normalizedAssignedTo.length > 0 && Number(projectDoc.ownerId) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can assign members to tasks'
      });
    }

    const allowedMemberIds = getProjectMemberIds(projectDoc);
    const invalidAssignees = normalizedAssignedTo.filter((userId) => !allowedMemberIds.includes(userId));

    if (invalidAssignees.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All assignees must be members of the project'
      });
    }

    const task = await Task.create({
      title,
      description,
      projectId: normalizedProjectId,
      board: board || 'To Do',
      assignedTo: normalizedAssignedTo,
      createdById: req.user.id,
      priority,
      dueDate,
      tags,
      subtasks: normalizeSubtasks(subtasks)
    });

    const populatedTask = await getTaskWithRelations(task.id);

    const io = req.app.get('io');
    const teamMemberIds = getProjectMemberIds(projectDoc)
      .filter((memberId) => Number(memberId) !== Number(req.user.id));

    for (const memberId of teamMemberIds) {
      const isAssigned = normalizedAssignedTo.includes(Number(memberId));
      await emitUserNotification(io, {
        recipientId: memberId,
        senderId: req.user.id,
        type: isAssigned ? 'task_assigned' : 'task_updated',
        message: isAssigned
          ? `${req.user.name} assigned you to task: ${title}`
          : `${req.user.name} created a new task: ${title}`,
        relatedTaskId: task.id,
        relatedProjectId: normalizedProjectId
      });
    }

    res.status(201).json({
      success: true,
      task: populatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get tasks
// @route   GET /api/tasks?project=projectId
// @access  Private
export const getTasks = async (req, res) => {
  try {
    const { project, board, assignedTo } = req.query;

    const query = {};
    if (project) query.projectId = Number(project);
    if (board) query.board = board;
    const tasks = await Task.findAll({
      where: query,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title']
        }
      ],
      order: [['order', 'ASC']]
    });

    const normalizedTasks = tasks.map((task) => normalizeTaskPayload(task));

    const filteredTasks = assignedTo
      ? normalizedTasks.filter((task) => (Array.isArray(task.assignedTo) ? task.assignedTo : []).includes(Number(assignedTo)))
      : normalizedTasks;

    res.status(200).json({
      success: true,
      count: filteredTasks.length,
      tasks: filteredTasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req, res) => {
  try {
    const task = await getTaskWithRelations(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const project = await Project.findByPk(task.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!canAccessProject(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const previousAssignedTo = parseJsonArrayField(task.assignedTo).map(Number).filter((id) => Number.isInteger(id));

    const { title, description, priority, dueDate, tags, board, subtasks, assignedTo } = req.body;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (tags) task.tags = tags;
    if (board) task.board = board;
    if (subtasks !== undefined) task.subtasks = normalizeSubtasks(subtasks);
    if (assignedTo !== undefined) {
      if (Number(project.ownerId) !== Number(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Only project owner can assign members to tasks'
        });
      }

      const normalizedAssignedTo = Array.isArray(assignedTo)
        ? [...new Set(assignedTo.map(Number).filter((userId) => Number.isInteger(userId)))]
        : [];

      const allowedMemberIds = getProjectMemberIds(project);
      const invalidAssignees = normalizedAssignedTo.filter((userId) => !allowedMemberIds.includes(userId));
      if (invalidAssignees.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'All assignees must be members of the project'
        });
      }

      task.assignedTo = normalizedAssignedTo;
    }

    await task.save();

    const updatedTask = await getTaskWithRelations(task.id);

    if (assignedTo !== undefined) {
      const io = req.app.get('io');
      const nowAssigned = parseJsonArrayField(task.assignedTo).map(Number).filter((id) => Number.isInteger(id));
      const newlyAssigned = nowAssigned.filter(
        (userId) => !previousAssignedTo.includes(userId) && Number(userId) !== Number(req.user.id)
      );

      for (const userId of newlyAssigned) {
        await emitUserNotification(io, {
          recipientId: userId,
          senderId: req.user.id,
          type: 'task_assigned',
          message: `${req.user.name} assigned you to task: ${task.title}`,
          relatedTaskId: task.id,
          relatedProjectId: task.projectId
        });
      }
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(String(task.projectId)).emit('task_updated', updatedTask);

    res.status(200).json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only creator can delete
    if (task.createdById !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task'
      });
    }

    const taskId = task.id;
    const taskProjectId = task.projectId;
    await task.destroy();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(String(taskProjectId)).emit('task_deleted', taskId);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign task to users
// @route   POST /api/tasks/:id/assign
// @access  Private
export const assignTask = async (req, res) => {
  try {
    const { userIds } = req.body;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const project = await Project.findByPk(task.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!canAccessProject(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign users for this task'
      });
    }

    if (Number(project.ownerId) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can assign members to tasks'
      });
    }

    const allowedMemberIds = getProjectMemberIds(project);
    const normalizedUserIds = Array.isArray(userIds)
      ? [...new Set(userIds.map(Number).filter((userId) => Number.isInteger(userId)))]
      : [];
    const invalidAssignees = normalizedUserIds.filter((userId) => !allowedMemberIds.includes(userId));

    if (invalidAssignees.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All assignees must be members of the project'
      });
    }

    task.assignedTo = normalizedUserIds;
    await task.save();

    const updatedTask = await getTaskWithRelations(task.id);

    // Create notifications
    const io = req.app.get('io');
    for (const userId of normalizedUserIds) {
      if (Number(userId) !== Number(req.user.id)) {
        await emitUserNotification(io, {
          recipientId: userId,
          senderId: req.user.id,
          type: 'task_assigned',
          message: `${req.user.name} assigned you to task: ${task.title}`,
          relatedTaskId: task.id,
          relatedProjectId: task.projectId
        });
      }
    }

    res.status(200).json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task status
// @route   PATCH /api/tasks/:id/status
// @access  Private
export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.status = status;
    await task.save();

    const updatedTask = await getTaskWithRelations(task.id);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(String(task.projectId)).emit('task_updated', updatedTask);

    res.status(200).json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Move task to different board
// @route   PATCH /api/tasks/:id/move
// @access  Private
export const moveTask = async (req, res) => {
  try {
    const { board, order } = req.body;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const sourceBoard = task.board;
    const destinationBoard = board || sourceBoard;

    if (sourceBoard === destinationBoard) {
      const boardTasks = await reorderTasksInBoard(task.projectId, sourceBoard, task.id);
      const targetOrder = Number.isInteger(Number(order)) ? Number(order) : boardTasks.length;
      const safeTargetOrder = Math.max(0, Math.min(targetOrder, boardTasks.length));

      boardTasks.splice(safeTargetOrder, 0, task);

      for (let index = 0; index < boardTasks.length; index += 1) {
        const item = boardTasks[index];
        const nextBoard = destinationBoard;
        if (item.board !== nextBoard || item.order !== index) {
          item.board = nextBoard;
          item.order = index;
          await item.save();
        }
      }
    } else {
      const sourceTasks = await reorderTasksInBoard(task.projectId, sourceBoard, task.id);
      for (let index = 0; index < sourceTasks.length; index += 1) {
        if (sourceTasks[index].order !== index) {
          sourceTasks[index].order = index;
          await sourceTasks[index].save();
        }
      }

      const destinationTasks = await reorderTasksInBoard(task.projectId, destinationBoard, task.id);
      const targetOrder = Number.isInteger(Number(order)) ? Number(order) : destinationTasks.length;
      const safeTargetOrder = Math.max(0, Math.min(targetOrder, destinationTasks.length));

      destinationTasks.splice(safeTargetOrder, 0, task);

      for (let index = 0; index < destinationTasks.length; index += 1) {
        const item = destinationTasks[index];
        if (item.board !== destinationBoard || item.order !== index) {
          item.board = destinationBoard;
          item.order = index;
          await item.save();
        }
      }
    }

    const updatedTask = await getTaskWithRelations(task.id);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(String(task.projectId)).emit('task_moved', updatedTask);

    res.status(200).json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload attachment to task
// @route   POST /api/tasks/:id/attachments
// @access  Private
export const uploadTaskAttachment = async (req, res) => {
  try {
    console.log('📁 uploadTaskAttachment: Task ID:', req.params.id);
    console.log('📦 uploadTaskAttachment: File received:', req.file?.originalname, 'Size:', req.file?.size);
    
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      console.warn('⚠️ Task not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const project = await Project.findByPk(task.projectId);
    if (!project) {
      console.warn('⚠️ Project not found:', task.projectId);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!canAccessProject(project, req.user.id)) {
      console.warn('⚠️ User not authorized:', req.user.id, 'for project:', project.id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload files to this task'
      });
    }

    if (!req.file) {
      console.warn('⚠️ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const attachment = {
      filename: req.file.originalname,
      url: `/uploads/tasks/${req.file.filename}`,
      uploadedBy: req.user.id,
      uploadedByName: req.user.name,
      uploadedAt: new Date()
    };

    const attachments = parseJsonArrayField(task.attachments);
    const nextAttachments = [...attachments, attachment];
    task.set('attachments', nextAttachments);
    task.changed('attachments', true);

    await task.save();
    console.log('✅ File saved to task, attachments count:', nextAttachments.length);

    const updatedTask = await getTaskWithRelations(task.id);

    // Emit real-time update
    const io = req.app.get('io');
    io.to(String(task.projectId)).emit('task_updated', updatedTask);
    console.log('📡 Real-time update emitted to project room:', task.projectId);

    // Send notifications to team members
    const teamMemberIds = getProjectMemberIds(project)
      .filter((memberId) => Number(memberId) !== Number(req.user.id));

    console.log('📢 Sending notifications to team members:', teamMemberIds);
    for (const memberId of teamMemberIds) {
      try {
        await emitUserNotification(io, {
          recipientId: memberId,
          senderId: req.user.id,
          type: 'file_uploaded',
          message: `${req.user.name} uploaded a file to task: ${task.title}`,
          relatedTaskId: task.id,
          relatedProjectId: task.projectId
        });
      } catch (notificationError) {
        // Keep upload flow successful even if DB enum/schema is behind.
        await emitUserNotification(io, {
          recipientId: memberId,
          senderId: req.user.id,
          type: 'task_updated',
          message: `${req.user.name} uploaded a file to task: ${task.title}`,
          relatedTaskId: task.id,
          relatedProjectId: task.projectId
        });
      }
    }

    console.log('✅ uploadTaskAttachment: Sending response with updated task');
    res.status(200).json({
      success: true,
      task: updatedTask,
      attachment
    });
  } catch (error) {
    console.error('❌ uploadTaskAttachment error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
