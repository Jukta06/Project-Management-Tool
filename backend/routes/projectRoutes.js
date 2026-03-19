import express from 'express';
import { body } from 'express-validator';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
  archiveProject,
  restoreProject,
  inviteMemberByEmail,
  getProjectInvites,
  approveProjectInvite,
  rejectProjectInvite
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const projectValidation = [
  body('title').trim().notEmpty().withMessage('Project title is required')
];

// Routes
router.route('/')
  .get(protect, getProjects)
  .post(protect, projectValidation, createProject);

router.route('/:id')
  .get(protect, getProjectById)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);
router.put('/:id/members/:userId/role', protect, updateMemberRole);
router.patch('/:id/archive', protect, archiveProject);
router.patch('/:id/restore', protect, restoreProject);
router.post('/:id/invites', protect, inviteMemberByEmail);
router.get('/:id/invites', protect, getProjectInvites);
router.patch('/:id/invites/:inviteId/approve', protect, approveProjectInvite);
router.patch('/:id/invites/:inviteId/reject', protect, rejectProjectInvite);

export default router;
