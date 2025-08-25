
const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const { getMachines,createMachine, deleteMachine, updateMachineStatus } = require('../controllers/machineController');
const { uploadMachineImage, processUploadedFiles, validateAllowedFields } = require('../middleware/upload');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getMachines);
router.post('/', authorize('admin', 'administration'), validateAllowedFields(['machineImage']), uploadMachineImage, processUploadedFiles, createMachine);
router.delete('/:id', authorize('admin'), deleteMachine);
router.patch('/:id/status', authorize('admin', 'administration'), updateMachineStatus);

module.exports = router;
