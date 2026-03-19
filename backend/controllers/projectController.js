import { validationResult } from 'express-validator';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import ProjectInvite from '../models/ProjectInvite.js';

const normalizeMembers = (members = []) => {
  let source = members;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }

  if (!Array.isArray(source)) {
    source = source && typeof source === 'object' ? [source] : [];
  }

  return source
    .map((member) => ({
      userId: Number(member?.userId ?? member?.user),
      role: member?.role || 'member',
      addedAt: member?.addedAt || new Date().toISOString()
    }))
    .filter((member) => Number.isInteger(member.userId));
};

const findMember = (project, userId) => {
  const members = normalizeMembers(project.members);
  return members.find((member) => member.userId === Number(userId));
};

const isProjectMember = (project, userId) => {
  return project.ownerId === Number(userId) || Boolean(findMember(project, userId));
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

const normalizeBoards = (boards = []) => {
  if (!Array.isArray(boards)) {
    throw new Error('Boards must be an array');
  }

  const normalized = boards
    .map((board, index) => ({
      name: String(board?.name || '').trim(),
      order: Number.isInteger(board?.order) ? board.order : index
    }))
    .filter((board) => board.name.length > 0)
    .sort((a, b) => a.order - b.order)
    .map((board, index) => ({ ...board, order: index }));

  if (normalized.length === 0) {
    throw new Error('At least one column is required');
  }

  const uniqueNames = new Set(normalized.map((board) => board.name.toLowerCase()));
  if (uniqueNames.size !== normalized.length) {
    throw new Error('Column names must be unique');
  }

  return normalized;
};

const buildRenameMap = (oldBoards = [], newBoards = []) => {
  const renames = [];
  const limit = Math.min(oldBoards.length, newBoards.length);

  for (let i = 0; i < limit; i += 1) {
    const oldName = String(oldBoards[i]?.name || '').trim();
    const newName = String(newBoards[i]?.name || '').trim();
    if (oldName && newName && oldName !== newName) {
      renames.push({ oldName, newName });
    }
  }

  return renames;
};

const getProjectWithOwner = async (projectId) => {
  return await Project.findByPk(projectId, {
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email', 'avatar']
      }
    ]
  });
};

const canManageProject = (project, userId) => {
  const member = findMember(project, userId);
  return project.ownerId === Number(userId) || (member && member.role === 'admin');
};

const isOwner = (project, userId) => project.ownerId === Number(userId);

const addMemberByUserId = (project, userId, role = 'member') => {
  const normalizedMembers = normalizeMembers(project.members);
  const alreadyMember = normalizedMembers.some((member) => member.userId === Number(userId));

  if (alreadyMember) {
    return { changed: false, members: normalizedMembers };
  }

  normalizedMembers.push({
    userId: Number(userId),
    role,
    addedAt: new Date().toISOString()
  });

  return { changed: true, members: normalizedMembers };
};

const withMemberDetails = async (project) => {
  if (!project) return project;

  const projectJson = project.toJSON ? project.toJSON() : project;
  projectJson.members = parseJsonArrayField(projectJson.members);
  projectJson.boards = parseJsonArrayField(projectJson.boards);
  const normalizedMembers = normalizeMembers(projectJson.members || []);
  const memberIds = [...new Set(normalizedMembers.map((member) => member.userId))];

  if (!memberIds.includes(Number(projectJson.ownerId))) {
    memberIds.push(Number(projectJson.ownerId));
  }

  const users = await User.findAll({
    where: { id: memberIds },
    attributes: ['id', 'name', 'email', 'avatar']
  });

  const roleByUserId = new Map(
    normalizedMembers.map((member) => [Number(member.userId), member.role || 'member'])
  );

  projectJson.memberDetails = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: projectJson.ownerId === user.id ? 'owner' : (roleByUserId.get(user.id) || 'member')
  }));

  return projectJson;
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, color } = req.body;

    const project = await Project.create({
      title,
      description,
      color,
      ownerId: req.user.id,
      members: [{ userId: req.user.id, role: 'admin', addedAt: new Date().toISOString() }]
    });

    const populatedProject = await getProjectWithOwner(project.id);
    const projectWithMembers = await withMemberDetails(populatedProject);

    res.status(201).json({
      success: true,
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const allProjects = await Project.findAll({
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const projects = allProjects.filter((project) => isProjectMember(project, req.user.id));
    const projectsWithMembers = await Promise.all(projects.map(withMemberDetails));

    res.status(200).json({
      success: true,
      count: projectsWithMembers.length,
      projects: projectsWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req, res) => {
  try {
    const project = await getProjectWithOwner(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is a member
    if (!isProjectMember(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    const projectWithMembers = await withMemberDetails(project);

    res.status(200).json({
      success: true,
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is owner or admin
    const member = findMember(project, req.user.id);

    if (project.ownerId !== Number(req.user.id) && (!member || member.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    const { title, description, color, status, boards } = req.body;

    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (status) project.status = status;
    if (boards !== undefined) {
      const oldBoards = parseJsonArrayField(project.boards);
      const normalizedBoards = normalizeBoards(boards);
      const renameMap = buildRenameMap(oldBoards, normalizedBoards);

      for (const rename of renameMap) {
        await Task.update(
          { board: rename.newName },
          {
            where: {
              projectId: project.id,
              board: rename.oldName
            }
          }
        );
      }

      project.boards = normalizedBoards;
    }
    project.members = normalizeMembers(project.members);

    await project.save();

    const updatedProject = await getProjectWithOwner(project.id);
    const projectWithMembers = await withMemberDetails(updatedProject);

    res.status(200).json({
      success: true,
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only owner can delete
    if (project.ownerId !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }

    await project.destroy();

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
export const addMember = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if requester is owner or admin
    const requesterMember = findMember(project, req.user.id);

    if (project.ownerId !== Number(req.user.id) && (!requesterMember || requesterMember.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add members'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already a member
    const normalizedMembers = normalizeMembers(project.members);
    const alreadyMember = normalizedMembers.find(
      (member) => member.userId === Number(userId)
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member'
      });
    }

    normalizedMembers.push({
      userId: Number(userId),
      role: role || 'member',
      addedAt: new Date().toISOString()
    });

    project.members = normalizedMembers;

    await project.save();

    const updatedProject = await getProjectWithOwner(project.id);
    const projectWithMembers = await withMemberDetails(updatedProject);

    res.status(200).json({
      success: true,
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if requester is owner or admin
    const requesterMember = findMember(project, req.user.id);

    if (project.ownerId !== Number(req.user.id) && (!requesterMember || requesterMember.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove members'
      });
    }

    if (project.ownerId === Number(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'Project owner cannot be removed'
      });
    }

    project.members = normalizeMembers(project.members).filter(
      (member) => member.userId !== Number(req.params.userId)
    );

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update member role
// @route   PUT /api/projects/:id/members/:userId/role
// @access  Private
export const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only owner can update roles
    if (project.ownerId !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update member roles'
      });
    }

    const normalizedMembers = normalizeMembers(project.members);
    const member = normalizedMembers.find(
      (m) => m.userId === Number(req.params.userId)
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    member.role = role;
    project.members = normalizedMembers;
    await project.save();

    const updatedProject = await getProjectWithOwner(project.id);
    const projectWithMembers = await withMemberDetails(updatedProject);

    res.status(200).json({
      success: true,
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Archive completed project
// @route   PATCH /api/projects/:id/archive
// @access  Private
export const archiveProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!canManageProject(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to archive this project'
      });
    }

    if (project.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed projects can be archived'
      });
    }

    project.status = 'archived';
    await project.save();

    const updatedProject = await getProjectWithOwner(project.id);
    const projectWithMembers = await withMemberDetails(updatedProject);

    res.status(200).json({
      success: true,
      message: 'Project archived successfully',
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Restore archived project
// @route   PATCH /api/projects/:id/restore
// @access  Private
export const restoreProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!canManageProject(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to restore this project'
      });
    }

    if (project.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Only archived projects can be restored'
      });
    }

    project.status = 'active';
    await project.save();

    const updatedProject = await getProjectWithOwner(project.id);
    const projectWithMembers = await withMemberDetails(updatedProject);

    res.status(200).json({
      success: true,
      message: 'Project restored successfully',
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Invite user to project by email
// @route   POST /api/projects/:id/invites
// @access  Private
export const inviteMemberByEmail = async (req, res) => {
  try {
    const { email, role } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!isProjectMember(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only project members can send invites'
      });
    }

    const targetUser = await User.findOne({
      where: { email: normalizedEmail },
      attributes: ['id', 'name', 'email']
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    const memberExists = Boolean(findMember(project, targetUser.id)) || project.ownerId === Number(targetUser.id);
    if (memberExists) {
      return res.status(400).json({
        success: false,
        message: 'User is already in this project'
      });
    }

    const existingPendingInvite = await ProjectInvite.findOne({
      where: {
        projectId: project.id,
        email: normalizedEmail,
        status: 'pending'
      }
    });

    if (existingPendingInvite) {
      return res.status(400).json({
        success: false,
        message: 'An invite request for this email is already pending'
      });
    }

    const inviteRole = role === 'admin' ? 'admin' : 'member';
    const ownerInvite = isOwner(project, req.user.id);
    const io = req.app.get('io');

    if (ownerInvite) {
      const memberUpdate = addMemberByUserId(project, targetUser.id, inviteRole);
      project.members = memberUpdate.members;
      await project.save();

      const invite = await ProjectInvite.create({
        projectId: project.id,
        email: normalizedEmail,
        role: inviteRole,
        status: 'approved',
        invitedById: req.user.id,
        inviteeUserId: targetUser.id,
        approvedById: req.user.id,
        approvedAt: new Date(),
        decisionNote: 'Auto-approved by owner'
      });

      const notification = await Notification.create({
        recipientId: targetUser.id,
        senderId: req.user.id,
        type: 'project_invite',
        message: `${req.user.name} added you to project ${project.title}`,
        relatedProjectId: project.id
      });

      io.to(String(targetUser.id)).emit('notification', notification);

      const updatedProject = await getProjectWithOwner(project.id);
      const projectWithMembers = await withMemberDetails(updatedProject);

      return res.status(200).json({
        success: true,
        message: 'User added to project successfully',
        invite,
        project: projectWithMembers
      });
    }

    const invite = await ProjectInvite.create({
      projectId: project.id,
      email: normalizedEmail,
      role: inviteRole,
      status: 'pending',
      invitedById: req.user.id,
      inviteeUserId: targetUser.id
    });

    const inviteeNotification = await Notification.create({
      recipientId: targetUser.id,
      senderId: req.user.id,
      type: 'project_invite',
      message: `${req.user.name} invited you to project ${project.title}. Waiting for owner approval.`,
      relatedProjectId: project.id
    });

    io.to(String(targetUser.id)).emit('notification', inviteeNotification);

    const ownerNotification = await Notification.create({
      recipientId: project.ownerId,
      senderId: req.user.id,
      type: 'project_invite',
      message: `${req.user.name} requested to invite ${normalizedEmail} to project ${project.title}`,
      relatedProjectId: project.id
    });

    io.to(String(project.ownerId)).emit('notification', ownerNotification);

    return res.status(200).json({
      success: true,
      message: 'Invite request sent to project owner for approval',
      invite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get project invites
// @route   GET /api/projects/:id/invites
// @access  Private
export const getProjectInvites = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!isProjectMember(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view invites for this project'
      });
    }

    const where = { projectId: project.id };
    const requestedStatus = String(req.query.status || '').trim();
    if (requestedStatus) {
      where.status = requestedStatus;
    }

    const invites = await ProjectInvite.findAll({
      where,
      include: [
        { model: User, as: 'invitedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'invitee', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: invites.length,
      invites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve project invite request
// @route   PATCH /api/projects/:id/invites/:inviteId/approve
// @access  Private (Owner)
export const approveProjectInvite = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!isOwner(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can approve invite requests'
      });
    }

    const invite = await ProjectInvite.findOne({
      where: {
        id: req.params.inviteId,
        projectId: project.id
      }
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite request not found'
      });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending invite requests can be approved'
      });
    }

    const targetUser = invite.inviteeUserId
      ? await User.findByPk(invite.inviteeUserId, { attributes: ['id', 'name', 'email'] })
      : await User.findOne({ where: { email: invite.email }, attributes: ['id', 'name', 'email'] });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Invited user account not found'
      });
    }

    const memberUpdate = addMemberByUserId(project, targetUser.id, invite.role || 'member');
    project.members = memberUpdate.members;
    await project.save();

    invite.status = 'approved';
    invite.approvedById = req.user.id;
    invite.approvedAt = new Date();
    invite.inviteeUserId = targetUser.id;
    invite.decisionNote = 'Approved by owner';
    await invite.save();

    const io = req.app.get('io');
    const notifyInvitee = await Notification.create({
      recipientId: targetUser.id,
      senderId: req.user.id,
      type: 'project_invite',
      message: `Your invite to project ${project.title} has been approved`,
      relatedProjectId: project.id
    });

    io.to(String(targetUser.id)).emit('notification', notifyInvitee);

    if (Number(invite.invitedById) !== Number(req.user.id)) {
      const notifyRequester = await Notification.create({
        recipientId: invite.invitedById,
        senderId: req.user.id,
        type: 'project_invite',
        message: `Your invite request for ${invite.email} was approved`,
        relatedProjectId: project.id
      });

      io.to(String(invite.invitedById)).emit('notification', notifyRequester);
    }

    const updatedProject = await getProjectWithOwner(project.id);
    const projectWithMembers = await withMemberDetails(updatedProject);

    res.status(200).json({
      success: true,
      message: 'Invite approved and user added to project',
      invite,
      project: projectWithMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reject project invite request
// @route   PATCH /api/projects/:id/invites/:inviteId/reject
// @access  Private (Owner)
export const rejectProjectInvite = async (req, res) => {
  try {
    const { note } = req.body;
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!isOwner(project, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only project owner can reject invite requests'
      });
    }

    const invite = await ProjectInvite.findOne({
      where: {
        id: req.params.inviteId,
        projectId: project.id
      }
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite request not found'
      });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending invite requests can be rejected'
      });
    }

    invite.status = 'rejected';
    invite.approvedById = req.user.id;
    invite.approvedAt = new Date();
    invite.decisionNote = note ? String(note).slice(0, 250) : 'Rejected by owner';
    await invite.save();

    const io = req.app.get('io');
    if (Number(invite.invitedById) !== Number(req.user.id)) {
      const notifyRequester = await Notification.create({
        recipientId: invite.invitedById,
        senderId: req.user.id,
        type: 'project_invite',
        message: `Your invite request for ${invite.email} was rejected`,
        relatedProjectId: project.id
      });

      io.to(String(invite.invitedById)).emit('notification', notifyRequester);
    }

    res.status(200).json({
      success: true,
      message: 'Invite request rejected',
      invite
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
