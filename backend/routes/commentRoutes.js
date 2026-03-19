import express from 'express';
import { body } from 'express-validator';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment
} from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const commentValidation = [
  body('content').trim().notEmpty().withMessage('Comment content is required'),
  body('task').notEmpty().withMessage('Task is required')
];

// Routes
router.route('/')
  .post(protect, commentValidation, createComment);

router.get('/task/:taskId', protect, getComments);

router.route('/:id')
  .put(protect, updateComment)
  .delete(protect, deleteComment);

export default router;
