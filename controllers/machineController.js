// controllers/machineController.js
const { Machine, FileAttachment, AuditLog } = require("../models");
const Joi = require("joi");
const logger = require("../logger");
const path = require("path");
const { deleteFile, getPublicUrl } = require("../middleware/upload");

// --- CORRECTION : Schéma de validation aligné sur le modèle Sequelize ---
// On ne garde que les champs que le frontend envoie et que le modèle peut accepter.
const createMachineSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  reference: Joi.string().required(),
  brand: Joi.string().min(2).max(50).allow("").optional(), // Permet une chaîne vide
  model: Joi.string().min(2).max(50).allow("").optional(),
  serialNumber: Joi.string().allow("").optional(), // Assurez-vous que ce champ est envoyé ou non
  location: Joi.string().min(2).max(100).required(),
  department: Joi.string().required(),
  description: Joi.string().allow("").optional(),
  status: Joi.string()
    .valid("operational", "maintenance", "breakdown", "retired")
    .optional(),
  priority: Joi.string().valid("low", "medium", "high", "critical").optional(),
  // On ne valide pas les dates ici car elles sont souvent gérées par le backend ou optionnelles
});

const getMachines = async (req, res) => {
  try {
    // Recherche avec filtres éventuels
    const { status, search } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.name = { [require('sequelize').Op.ilike]: `%${search}%` };
    }
    const machines = await Machine.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    // Toujours renvoyer le champ image sous forme d'URL publique ou null
    const machinesWithImage = machines.map(machine => {
      const m = machine.toJSON();
      m.image = m.image ? getPublicUrl(m.image) : null;
      return m;
    });
    // Calculer les statusCounts pour le frontend
    const allMachines = await Machine.findAll();
    const statusCounts = {
      operational: allMachines.filter(m => m.status === 'operational').length,
      maintenance: allMachines.filter(m => m.status === 'maintenance').length,
      breakdown: allMachines.filter(m => m.status === 'breakdown').length,
      total: allMachines.length
    };
    res.json({ machines: machinesWithImage, statusCounts });
  } catch (error) {
    logger.error('Erreur récupération machines:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const createMachine = async (req, res) => {
  try {
    let data = req.body;
    let imagePath = null;

    // Gérer l'upload d'image
    if (req.file) {
      imagePath = getPublicUrl(req.file.path);
      
      // Créer l'enregistrement FileAttachment
      await FileAttachment.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: 'image',
        fileType: 'machine',
        machineId: null, // Sera mis à jour après création de la machine
        uploadedBy: req.user.id,
        description: `Image pour la machine ${data.name}`
      });
    }

    const { error } = createMachineSchema.validate(data);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const newMachine = await Machine.create({
      ...data,
      image: imagePath
    });

    // Mettre à jour le FileAttachment avec l'ID de la machine
    if (req.file) {
      await FileAttachment.update(
        { machineId: newMachine.id },
        { 
          where: { 
            filename: req.file.filename,
            fileType: 'machine',
            machineId: null
          }
        }
      );
    }

    // Log de création
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "CREATE",
        entity: "Machine",
        entityId: newMachine.id,
        details: `Machine créée: ${newMachine.name} (${newMachine.reference})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.warn("Erreur lors de la création du log d'audit:", auditError);
      // Ne pas faire échouer la création pour un problème d'audit
    }

    res.status(201).json(newMachine);
  } catch (error) {
    logger.error("Erreur création machine:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message:
          "Une machine avec cette référence ou ce numéro de série existe déjà.",
      });
    }
    res.status(500).json({ message: "Erreur serveur interne." });
  }
};

const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const machine = await Machine.findByPk(id);
    if (!machine) return res.status(404).json({ error: "Machine non trouvée" });
    // Supprimer tous les fichiers associés
    const attachments = await FileAttachment.findAll({ where: { machineId: machine.id } });
    for (const attachment of attachments) {
      if (attachment.path && require('fs').existsSync(attachment.path)) {
        try { require('fs').unlinkSync(attachment.path); } catch (e) { /* ignorer */ }
      }
      await attachment.destroy();
    }
    await machine.destroy();
    // Log d’audit
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "DELETE",
        entity: "Machine",
        entityId: machine.id,
        details: `Machine supprimée: ${machine.name} (${machine.reference})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) { logger.warn("Erreur log audit suppression machine:", auditError); }
    res.json({ message: "Machine et fichiers associés supprimés" });
  } catch (error) {
    logger.error("Erreur suppression machine:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const updateMachineStatusSchema = Joi.object({
  status: Joi.string().valid('operational', 'maintenance', 'breakdown', 'retired').required()
});

const updateMachineStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateMachineStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const machine = await Machine.findByPk(id);
    if (!machine) return res.status(404).json({ error: 'Machine non trouvée' });
    const oldStatus = machine.status;
    await machine.update({ status: value.status });
    // Log d'audit
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "UPDATE_STATUS",
        entity: "Machine",
        entityId: machine.id,
        details: `Statut modifié de ${oldStatus} à ${value.status}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) { logger.warn("Erreur log audit statut machine:", auditError); }
    res.json({ message: 'Statut mis à jour', machine });
  } catch (error) {
    logger.error('Erreur modification statut machine:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = {
  getMachines,
  createMachine,
  deleteMachine,
  updateMachineStatus,
};
