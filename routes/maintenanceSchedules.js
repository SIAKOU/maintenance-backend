const express = require('express');
const { 
  getAllMaintenanceSchedules,
  getMaintenanceScheduleById,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  completeMaintenance,
  getOverdueMaintenances,
  getMaintenanceStats
} = require('../controllers/maintenanceScheduleController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadReportFiles, processUploadedFiles, handleUploadError, validateAllowedFields } = require('../middleware/upload');

const router = express.Router();

// Routes pour les planifications de maintenance
router.get('/', authenticateToken, getAllMaintenanceSchedules);
router.get('/overdue', authenticateToken, getOverdueMaintenances);
router.get('/stats', authenticateToken, getMaintenanceStats);
router.get('/:id', authenticateToken, getMaintenanceScheduleById);

// Routes protégées - accessible aux techniciens et admins
router.post('/', authenticateToken, authorize('admin', 'technician'), createMaintenanceSchedule);
router.put('/:id', authenticateToken, authorize('admin', 'technician'), updateMaintenanceSchedule);
router.delete('/:id', authenticateToken, authorize('admin'), deleteMaintenanceSchedule);

// Route pour finaliser une maintenance
router.post('/:id/complete', authenticateToken, authorize('admin', 'technician'), 
  validateAllowedFields(['files']), uploadReportFiles, handleUploadError, processUploadedFiles, completeMaintenance);

module.exports = router; 