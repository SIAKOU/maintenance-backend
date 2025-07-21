const { MaintenanceSchedule, Machine, User, FileAttachment, AuditLog, Sequelize } = require("../models");
const { Op } = Sequelize;
const Joi = require("joi");
const logger = require("../logger");
const { getPublicUrl, deleteFile } = require("../middleware/upload");

// Schémas de validation
const createMaintenanceSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().optional(),
  machineId: Joi.number().integer().positive().required(),
  technicianId: Joi.number().integer().positive().optional(),
  scheduledDate: Joi.date().iso().required(),
  estimatedDuration: Joi.number().integer().min(15).max(1440).default(60), // 15 min à 24h
  maintenanceType: Joi.string().valid("preventive", "corrective", "emergency", "inspection").default("preventive"),
  priority: Joi.string().valid("low", "medium", "high", "critical").default("medium"),
  frequency: Joi.string().valid("once", "daily", "weekly", "monthly", "quarterly", "yearly").default("once"),
  recurrencePattern: Joi.object().optional(),
  checklist: Joi.array().items(Joi.string()).optional(),
  requiredParts: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().integer().positive().required(),
    estimatedCost: Joi.number().positive().optional()
  })).optional(),
  estimatedCost: Joi.number().positive().optional(),
  notes: Joi.string().optional(),
});

const updateMaintenanceSchema = Joi.object({
  title: Joi.string().min(5).max(200).optional(),
  description: Joi.string().optional(),
  technicianId: Joi.number().integer().positive().optional(),
  scheduledDate: Joi.date().iso().optional(),
  estimatedDuration: Joi.number().integer().min(15).max(1440).optional(),
  maintenanceType: Joi.string().valid("preventive", "corrective", "emergency", "inspection").optional(),
  priority: Joi.string().valid("low", "medium", "high", "critical").optional(),
  status: Joi.string().valid("scheduled", "in_progress", "completed", "cancelled", "overdue").optional(),
  checklist: Joi.array().items(Joi.string()).optional(),
  requiredParts: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    quantity: Joi.number().integer().positive().required(),
    estimatedCost: Joi.number().positive().optional()
  })).optional(),
  estimatedCost: Joi.number().positive().optional(),
  actualCost: Joi.number().positive().optional(),
  notes: Joi.string().optional(),
  completionNotes: Joi.string().optional(),
});

// Récupérer toutes les planifications de maintenance
const getAllMaintenanceSchedules = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      machineId, 
      technicianId, 
      maintenanceType,
      startDate,
      endDate,
      search 
    } = req.query;

    const where = {};
    const include = [
      {
        model: Machine,
        as: "machine",
        attributes: ["id", "name", "reference", "brand", "model", "location", "department", "status"]
      },
      {
        model: User,
        as: "technician",
        attributes: ["id", "firstName", "lastName", "email", "role"]
      }
    ];

    // Filtres
    if (status) where.status = status;
    if (machineId) where.machineId = machineId;
    if (technicianId) where.technicianId = technicianId;
    if (maintenanceType) where.maintenanceType = maintenanceType;
    
    if (startDate && endDate) {
      where.scheduledDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.ilike]: `%${search}%` } },
        { description: { [Op.ilike]: `%${search}%` } },
        { '$machine.name$': { [Op.ilike]: `%${search}%` } },
        { '$machine.reference$': { [Op.ilike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;
    
    const { count, rows: schedules } = await MaintenanceSchedule.findAndCountAll({
      where,
      include,
      order: [["scheduledDate", "ASC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Calculer les statistiques
    const stats = await MaintenanceSchedule.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});

    res.json({
      schedules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      },
      stats: statusCounts
    });
  } catch (error) {
    logger.error("Erreur récupération planifications:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer une planification par ID
const getMaintenanceScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await MaintenanceSchedule.findByPk(id, {
      include: [
        {
          model: Machine,
          as: "machine",
          attributes: ["id", "name", "reference", "brand", "model", "location", "department", "status", "image"]
        },
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email", "role", "avatar"]
        },
        {
          model: User,
          as: "completedByUser",
          attributes: ["id", "firstName", "lastName", "email", "role"]
        },
        {
          model: FileAttachment,
          as: "attachments",
          attributes: ["id", "filename", "originalName", "path", "mimetype", "size", "category", "description"]
        }
      ]
    });

    if (!schedule) {
      return res.status(404).json({ error: "Planification non trouvée" });
    }

    res.json(schedule);
  } catch (error) {
    logger.error("Erreur récupération planification:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Créer une nouvelle planification
const createMaintenanceSchedule = async (req, res) => {
  try {
    const data = req.body;
    
    const { error } = createMaintenanceSchema.validate(data);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérifier que la machine existe
    const machine = await Machine.findByPk(data.machineId);
    if (!machine) {
      return res.status(404).json({ error: "Machine non trouvée" });
    }

    // Vérifier que le technicien existe si spécifié
    if (data.technicianId) {
      const technician = await User.findByPk(data.technicianId);
      if (!technician || !["technician", "admin"].includes(technician.role)) {
        return res.status(400).json({ error: "Technicien invalide" });
      }
    }

    // Calculer la prochaine date si c'est une maintenance récurrente
    let nextScheduledDate = null;
    if (data.frequency !== "once") {
      nextScheduledDate = calculateNextScheduledDate(data.scheduledDate, data.frequency);
    }

    const schedule = await MaintenanceSchedule.create({
      ...data,
      nextScheduledDate,
      status: "scheduled"
    });

    // Log de création
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "CREATE",
        entity: "MaintenanceSchedule",
        entityId: schedule.id,
        details: `Planification créée: ${schedule.title} pour ${machine.name}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.warn("Erreur lors de la création du log d'audit:", auditError);
    }

    // Mettre à jour la machine
    await machine.update({
      lastMaintenanceDate: data.scheduledDate,
      nextMaintenanceDate: nextScheduledDate || data.scheduledDate
    });

    res.status(201).json({
      message: "Planification créée avec succès",
      schedule
    });
  } catch (error) {
    logger.error("Erreur création planification:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Mettre à jour une planification
const updateMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const schedule = await MaintenanceSchedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ error: "Planification non trouvée" });
    }

    const { error } = updateMaintenanceSchema.validate(data);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérifier que le technicien existe si spécifié
    if (data.technicianId) {
      const technician = await User.findByPk(data.technicianId);
      if (!technician || !["technician", "admin"].includes(technician.role)) {
        return res.status(400).json({ error: "Technicien invalide" });
      }
    }

    // Gérer la finalisation de la maintenance
    if (data.status === "completed" && schedule.status !== "completed") {
      data.completedAt = new Date();
      data.completedBy = req.user.id;
      
      // Calculer la prochaine maintenance si récurrente
      if (schedule.frequency !== "once") {
        data.nextScheduledDate = calculateNextScheduledDate(
          data.completedAt, 
          schedule.frequency
        );
      }
    }

    await schedule.update(data);

    // Log de modification
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "UPDATE",
        entity: "MaintenanceSchedule",
        entityId: schedule.id,
        details: `Planification modifiée: ${schedule.title}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.warn("Erreur lors de la création du log d'audit:", auditError);
    }

    res.json({
      message: "Planification mise à jour avec succès",
      schedule
    });
  } catch (error) {
    logger.error("Erreur mise à jour planification:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Supprimer une planification
const deleteMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await MaintenanceSchedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ error: "Planification non trouvée" });
    }

    // Supprimer les fichiers associés
    const attachments = await FileAttachment.findAll({
      where: { maintenanceScheduleId: id }
    });

    for (const attachment of attachments) {
      deleteFile(attachment.path);
      await attachment.destroy();
    }

    await schedule.destroy();

    // Log de suppression
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "DELETE",
        entity: "MaintenanceSchedule",
        entityId: parseInt(id),
        details: `Planification supprimée: ${schedule.title}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.warn("Erreur lors de la création du log d'audit:", auditError);
    }

    res.json({ message: "Planification supprimée avec succès" });
  } catch (error) {
    logger.error("Erreur suppression planification:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Marquer une maintenance comme terminée
const completeMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { completionNotes, actualCost } = req.body;
    
    const schedule = await MaintenanceSchedule.findByPk(id, {
      include: [{ model: Machine, as: "machine" }]
    });
    
    if (!schedule) {
      return res.status(404).json({ error: "Planification non trouvée" });
    }

    if (schedule.status === "completed") {
      return res.status(400).json({ error: "Cette maintenance est déjà terminée" });
    }

    const updateData = {
      status: "completed",
      completedAt: new Date(),
      completedBy: req.user.id,
      completionNotes,
      actualCost: actualCost || 0
    };

    // Calculer la prochaine maintenance si récurrente
    if (schedule.frequency !== "once") {
      updateData.nextScheduledDate = calculateNextScheduledDate(
        updateData.completedAt, 
        schedule.frequency
      );
    }

    await schedule.update(updateData);

    // Mettre à jour la machine
    await schedule.machine.update({
      lastMaintenanceDate: updateData.completedAt,
      nextMaintenanceDate: updateData.nextScheduledDate || updateData.completedAt,
      status: "operational"
    });

    // Log de finalisation
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "UPDATE",
        entity: "MaintenanceSchedule",
        entityId: schedule.id,
        details: `Maintenance terminée: ${schedule.title}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.warn("Erreur lors de la création du log d'audit:", auditError);
    }

    res.json({
      message: "Maintenance terminée avec succès",
      schedule
    });
  } catch (error) {
    logger.error("Erreur finalisation maintenance:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Fonction utilitaire pour calculer la prochaine date
const calculateNextScheduledDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return date;
};

// Récupérer les maintenances en retard
const getOverdueMaintenances = async (req, res) => {
  try {
    const overdueSchedules = await MaintenanceSchedule.findAll({
      where: {
        status: "scheduled",
        scheduledDate: {
          [Op.lt]: new Date()
        }
      },
      include: [
        {
          model: Machine,
          as: "machine",
          attributes: ["id", "name", "reference", "location", "department"]
        },
        {
          model: User,
          as: "technician",
          attributes: ["id", "firstName", "lastName", "email"]
        }
      ],
      order: [["scheduledDate", "ASC"]]
    });

    res.json(overdueSchedules);
  } catch (error) {
    logger.error("Erreur récupération maintenances en retard:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les statistiques de maintenance
const getMaintenanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.scheduledDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const stats = await MaintenanceSchedule.findAll({
      where,
      attributes: [
        'status',
        'maintenanceType',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('actual_cost')), 'totalCost']
      ],
      group: ['status', 'maintenanceType'],
      raw: true
    });

    const summary = {
      total: 0,
      completed: 0,
      inProgress: 0,
      scheduled: 0,
      overdue: 0,
      cancelled: 0,
      totalCost: 0,
      byType: {}
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      const cost = parseFloat(stat.totalCost) || 0;
      
      summary.total += count;
      summary.totalCost += cost;
      
      if (stat.status === "completed") summary.completed += count;
      else if (stat.status === "in_progress") summary.inProgress += count;
      else if (stat.status === "scheduled") summary.scheduled += count;
      else if (stat.status === "overdue") summary.overdue += count;
      else if (stat.status === "cancelled") summary.cancelled += count;
      
      if (!summary.byType[stat.maintenanceType]) {
        summary.byType[stat.maintenanceType] = 0;
      }
      summary.byType[stat.maintenanceType] += count;
    });

    res.json(summary);
  } catch (error) {
    logger.error("Erreur récupération statistiques:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = {
  getAllMaintenanceSchedules,
  getMaintenanceScheduleById,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  completeMaintenance,
  getOverdueMaintenances,
  getMaintenanceStats
}; 