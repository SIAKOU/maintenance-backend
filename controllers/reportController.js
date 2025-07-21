
const { Report, Machine, User, FileAttachment, AuditLog, Sequelize } = require('../models');
const { Op } = Sequelize;
const Joi = require('joi');
const logger = require("../logger");
const { deleteFile, getPublicUrl } = require("../middleware/upload");

const reportSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  workDate: Joi.date().required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  machineId: Joi.number().integer().positive().required(),
  workType: Joi.string().valid('maintenance', 'repair', 'inspection', 'installation', 'other').required(),
  problemDescription: Joi.string().min(10).required(),
  actionsTaken: Joi.string().min(10).required(),
  partsUsed: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    reference: Joi.string(),
    quantity: Joi.number().positive().required()
  })),
  toolsUsed: Joi.array().items(Joi.string()),
  observations: Joi.string().allow(''),
  recommendations: Joi.string().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
});

const createReport = async (req, res) => {
  try {
    const { error } = reportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    // Calculer la durée en minutes
    const startTime = new Date(`1970-01-01T${req.body.startTime}:00`);
    const endTime = new Date(`1970-01-01T${req.body.endTime}:00`);
    const duration = Math.round((endTime - startTime) / (1000 * 60));
    if (duration <= 0) {
      return res.status(400).json({ error: 'L\'heure de fin doit être après l\'heure de début' });
    }
    const report = await Report.create({
      ...req.body,
      duration,
      technicianId: req.user.id,
      status: 'draft'
    });
    // Gérer l'upload de plusieurs fichiers
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = getPublicUrl(file.path);
        const category = file.mimetype.startsWith('image/') ? 'image' : 
                        file.mimetype.startsWith('video/') ? 'video' : 
                        file.mimetype.startsWith('audio/') ? 'audio' : 'document';
        
        await FileAttachment.create({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
          category: category,
          fileType: 'report',
          reportId: report.id,
          uploadedBy: req.user.id,
          description: `Fichier attaché au rapport: ${req.body.title}`
        });
      }
    }
    const reportWithRelations = await Report.findByPk(report.id, {
      include: [
        { model: Machine, as: 'machine' },
        { model: User, as: 'technician', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'] },
        { model: FileAttachment, as: 'attachments' }
      ]
    });
    res.status(201).json(reportWithRelations);
  } catch (error) {
    logger.error('Erreur création rapport:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, machineId, technicianId, workDate, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    
    if (status) where.status = status;
    if (machineId) where.machineId = machineId;
    if (workDate) where.workDate = workDate;

    if (search) {
      where.title = { [Op.ilike]: `%${search}%` };
    }
    
    // Les techniciens voient seulement leurs rapports
    if (req.user.role === 'technician') {
      where.technicianId = req.user.id;
    } else if (technicianId) {
      where.technicianId = technicianId;
    }

    const { count, rows } = await Report.findAndCountAll({
      where,
      include: [
        { model: Machine, as: 'machine' },
        { model: User, as: 'technician', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'] },
        { model: FileAttachment, as: 'attachments' }
      ],
      order: [['workDate', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Erreur récupération rapports:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const getReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, {
      include: [
        { model: Machine, as: 'machine' },
        { model: User, as: 'technician', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'] },
        { model: FileAttachment, as: 'attachments' }
      ]
    });

    if (!report) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'technician' && report.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    res.json(report);
  } catch (error) {
    logger.error('Erreur récupération rapport:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const updateReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'technician' && report.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Les techniciens ne peuvent modifier que les brouillons
    if (req.user.role === 'technician' && report.status !== 'draft') {
      return res.status(403).json({ error: 'Impossible de modifier un rapport soumis' });
    }

    const { error } = reportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Recalculer la durée si les heures ont changé
    let duration = report.duration;
    if (req.body.startTime || req.body.endTime) {
      const startTime = new Date(`1970-01-01T${req.body.startTime || report.startTime}:00`);
      const endTime = new Date(`1970-01-01T${req.body.endTime || report.endTime}:00`);
      duration = Math.round((endTime - startTime) / (1000 * 60));
    }

    await report.update({ ...req.body, duration });

    const updatedReport = await Report.findByPk(report.id, {
      include: [
        { model: Machine, as: 'machine' },
        { model: User, as: 'technician', attributes: ['id', 'firstName', 'lastName'] },
        { model: FileAttachment, as: 'attachments' }
      ]
    });

    res.json(updatedReport);
  } catch (error) {
    logger.error('Erreur mise à jour rapport:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const submitReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }

    if (report.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (report.status !== 'draft') {
      return res.status(400).json({ error: 'Ce rapport a déjà été soumis' });
    }

    await report.update({ status: 'submitted' });

    const updatedReport = await Report.findByPk(report.id, {
      include: [
        { model: Machine, as: 'machine' },
        { model: User, as: 'technician', attributes: ['id', 'firstName', 'lastName'] },
        { model: FileAttachment, as: 'attachments' }
      ]
    });

    res.json(updatedReport);
  } catch (error) {
    logger.error('Erreur soumission rapport:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ error: "Rapport non trouvé" });
    // Supprimer tous les fichiers associés
    const attachments = await FileAttachment.findAll({ where: { reportId: report.id } });
    for (const attachment of attachments) {
      if (attachment.path && require('fs').existsSync(attachment.path)) {
        try { require('fs').unlinkSync(attachment.path); } catch (e) { /* ignorer */ }
      }
      await attachment.destroy();
    }
    await report.destroy();
    // Log d’audit
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "DELETE",
        entity: "Report",
        entityId: report.id,
        details: `Rapport supprimé: ${report.title}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) { logger.warn("Erreur log audit suppression rapport:", auditError); }
    res.json({ message: "Rapport et fichiers associés supprimés" });
  } catch (error) {
    logger.error("Erreur suppression rapport:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = {
  createReport,
  getReports,
  getReport,
  updateReport,
  submitReport,
  deleteReport
};
