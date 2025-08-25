
const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  createReport,
  getReports,
  getReport,
  updateReport,
  submitReport,
  deleteReport
} = require('../controllers/reportController');
const { uploadReportFiles, processUploadedFiles, validateAllowedFields } = require('../middleware/upload');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

router.post('/', authorize('technician'), validateAllowedFields(['files']), uploadReportFiles, processUploadedFiles, createReport);
router.get('/', getReports);
router.get('/:id', getReport);
router.put('/:id', updateReport);
router.patch('/:id/submit', authorize('technician'), submitReport);
router.delete('/:id', authorize('admin', 'technician'), deleteReport);

module.exports = router;