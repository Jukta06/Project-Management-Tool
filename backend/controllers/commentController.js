import { validationResult } from 'express-validator';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Project from '../models/Project.js';

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

const getCommentWithAuthor = async (commentId) => {
  return await Comment.findByPk(commentId, {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email', 'avatar']
      }
    ]
  });
};

// @desc    Create new comment
// @route   POST /api/comments
// @access  Private
export const createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { content, task, taskId, parentComment, parentCommentId, mentions } = req.body;
    const normalizedTaskId = Number(taskId || task);
    const normalizedParentCommentId = parentCommentId || parentComment || null;

    // Check if task exists
    const taskDoc = await Task.findByPk(normalizedTaskId, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'ownerId', 'members']
        }
      ]
    });
    if (!taskDoc) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!canAccessProject(taskDoc.project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this task'
      });
    }

    if (normalizedParentCommentId) {
      const parent = await Comment.findByPk(normalizedParentCommentId);
      if (!parent || Number(parent.taskId) !== Number(normalizedTaskId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment for this task'
        });
      }
    }

    const comment = await Comment.create({
      content,
      taskId: normalizedTaskId,
      authorId: req.user.id,
      parentCommentId: normalizedParentCommentId,
      mentions: Array.isArray(mentions) ? mentions.map(Number) : []
    });

    const populatedComment = await getCommentWithAuthor(comment.id);

    const io = req.app.get('io');
    const normalizedMentions = Array.isArray(mentions)
      ? [...new Set(mentions.map(Number).filter((userId) => Number.isInteger(userId)))]
      : [];

    // Create notifications for mentions
    if (normalizedMentions.length > 0) {
      for (const userId of normalizedMentions) {
        if (Number(userId) !== Number(req.user.id)) {
          const notification = await Notification.create({
            recipientId: userId,
            senderId: req.user.id,
            type: 'mention',
            message: `${req.user.name} mentioned you in a comment`,
            relatedTaskId: normalizedTaskId,
            relatedProjectId: taskDoc.projectId
          });

          io.to(userId.toString()).emit('notification', notification);
        }
      }
    }

    const teamRecipients = getProjectMemberIds(taskDoc.project)
      .filter((userId) => Number(userId) !== Number(req.user.id))
      .filter((userId) => !normalizedMentions.includes(Number(userId)));

    for (const userId of teamRecipients) {
      const notification = await Notification.create({
        recipientId: userId,
        senderId: req.user.id,
        type: 'comment_added',
        message: `${req.user.name} commented on task: ${taskDoc.title}`,
        relatedTaskId: normalizedTaskId,
        relatedProjectId: taskDoc.projectId
      });

      io.to(String(userId)).emit('notification', notification);
    }

    // Emit real-time update
    io.to(String(taskDoc.projectId)).emit('comment_added', populatedComment);

    res.status(201).json({
      success: true,
      comment: populatedComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get comments for a task
// @route   GET /api/comments/task/:taskId
// @access  Private
export const getComments = async (req, res) => {
  try {
    const taskDoc = await Task.findByPk(req.params.taskId, {
      include: [{
        model: Project,
        as: 'project',
        attributes: ['id', 'ownerId', 'members']
      }]
    });

    if (!taskDoc) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (!canAccessProject(taskDoc.project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view comments for this task'
      });
    }

    const comments = await Comment.findAll({
      where: { taskId: req.params.taskId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
export const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Only author can update
    if (comment.authorId !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    const { content } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    comment.content = String(content).trim();
    comment.edited = true;
    comment.editedAt = new Date();

    await comment.save();

    const updatedComment = await getCommentWithAuthor(comment.id);

    res.status(200).json({
      success: true,
      comment: updatedComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Only author can delete
    if (comment.authorId !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await comment.destroy();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
