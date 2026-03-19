import express from 'express';
import {
  getUsers,
  getUserById,
  searchUsers
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/search', protect, searchUsers);
router.get('/:id', protect, getUserById);

export default router;
