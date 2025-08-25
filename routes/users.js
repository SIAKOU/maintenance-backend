
const express = require('express');
const { 
  getAllUsers, 
  createUser, 
  updateUser, 
  toggleUserStatus,
  deleteAvatar,
  deleteUser,
  updateAvatarOnly
} = require('../controllers/userController');
const { authenticateToken, authorize, authorizeSelfOrRoles } = require('../middleware/auth');
const { uploadAvatar, processUploadedFiles, handleUploadError, validateAllowedFields } = require('../middleware/upload');
const validateId = require('../middleware/validateId');


const router = express.Router();

// Routes protégées - accessible seulement aux admins
router.get('/', authenticateToken, authorize('admin'), getAllUsers);
router.post('/', authenticateToken, authorize('admin'), validateAllowedFields(['avatar']), uploadAvatar, handleUploadError, processUploadedFiles, createUser);
// Endpoint spécifique pour mise à jour d'avatar (évite 400 si autres champs manquent)
router.put('/:id/avatar', authenticateToken, authorizeSelfOrRoles('admin'), validateId('id'), validateAllowedFields(['avatar']), uploadAvatar, handleUploadError, processUploadedFiles, updateAvatarOnly);
// Endpoint générique de mise à jour (sans fichier)
router.put('/:id', authenticateToken, authorizeSelfOrRoles('admin'), validateId('id'), updateUser);
router.patch('/:id/toggle-status', authenticateToken, authorize('admin'), validateId('id'), toggleUserStatus);
router.delete('/:id/avatar', authenticateToken, authorizeSelfOrRoles('admin', 'technician', 'administration'), validateId('id'), deleteAvatar);
router.delete('/:id', authenticateToken, authorize('admin'), validateId('id'), deleteUser);


module.exports = router;