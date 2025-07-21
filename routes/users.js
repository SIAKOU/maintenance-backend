
const express = require('express');
const { 
  getAllUsers, 
  createUser, 
  updateUser, 
  toggleUserStatus,
  deleteAvatar,
  deleteUser
} = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadAvatar, processUploadedFiles, handleUploadError } = require('../middleware/upload');


const router = express.Router();

// Routes protégées - accessible seulement aux admins
router.get('/', authenticateToken, authorize('admin'), getAllUsers);
router.post('/', authenticateToken, authorize('admin'), uploadAvatar, handleUploadError, processUploadedFiles, createUser);
router.put('/:id', authenticateToken, authorize('admin'), uploadAvatar, handleUploadError, processUploadedFiles, updateUser);
router.patch('/:id/toggle-status', authenticateToken, authorize('admin'), toggleUserStatus);
router.delete('/:id/avatar', authenticateToken, authorize('admin', 'technician', 'administration'), deleteAvatar);
router.delete('/:id', authenticateToken, authorize('admin'), deleteUser);


module.exports = router;