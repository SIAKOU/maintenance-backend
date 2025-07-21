const { User, AuditLog, FileAttachment, Sequelize } = require("../models");
const { Op } = Sequelize;
const fs = require("fs");
const Joi = require("joi");
const logger = require("../logger");
const path = require("path");
const { deleteFile, getPublicUrl } = require("../middleware/upload");

const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string().valid("admin", "technician", "administration").required(),
  phone: Joi.string().min(10).max(15).optional(),
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid("admin", "technician", "administration").optional(),
  phone: Joi.string().min(10).max(15).optional(),
  isActive: Joi.boolean().optional(),
});

const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.ilike]: `%${search}%` } },
        { lastName: { [Op.ilike]: `%${search}%` } },
        { email: { [Op.ilike]: `%${search}%` } },
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    res.json({ users });
  } catch (error) {
    logger.error("Erreur récupération utilisateurs:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const createUser = async (req, res) => {
  try {
    let data = req.body;
    let avatarPath = null;

    // Gérer l'upload d'avatar
    if (req.file) {
      avatarPath = getPublicUrl(req.file.path);
      
      // Créer l'enregistrement FileAttachment
      await FileAttachment.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: 'image',
        fileType: 'avatar',
        userId: null, // Sera mis à jour après création de l'utilisateur
        uploadedBy: req.user.id,
        description: `Avatar pour ${data.firstName} ${data.lastName}`
      });
    }

    const { error } = createUserSchema.validate(data);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { firstName, lastName, email, password, role, phone } = data;
    
    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    // Créer l'utilisateur
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      isActive: true,
      avatar: avatarPath,
    });

    // Mettre à jour le FileAttachment avec l'ID de l'utilisateur
    if (req.file) {
      await FileAttachment.update(
        { userId: user.id },
        { 
          where: { 
            filename: req.file.filename,
            fileType: 'avatar',
            userId: null
          }
        }
      );
    }

    // Log de création
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        details: `Utilisateur créé: ${user.email} (${user.role})`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.warn("Erreur lors de la création du log d'audit:", auditError);
      // Ne pas faire échouer la création pour un problème d'audit
    }

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error("Erreur création utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const updateUser = async (req, res) => {
  try {
    let data = req.body;
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Gérer l'upload d'avatar
    if (req.file) {
      try {
        // Supprimer l'ancien avatar et son enregistrement
        if (user.avatar) {
          const oldAttachment = await FileAttachment.findOne({
            where: { userId: user.id, fileType: 'avatar' }
          });
          
          if (oldAttachment) {
            deleteFile(oldAttachment.path);
            await oldAttachment.destroy();
          }
        }

        // Créer le nouvel enregistrement FileAttachment
        const newAvatarPath = getPublicUrl(req.file.path);
        
        // Créer l'enregistrement FileAttachment avec gestion d'erreur
        const fileAttachment = await FileAttachment.create({
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size,
          category: 'image',
          fileType: 'avatar',
          userId: user.id,
          uploadedBy: req.user.id,
          description: `Avatar pour ${user.firstName} ${user.lastName}`
        });

        if (fileAttachment) {
          data.avatar = newAvatarPath;
          logger.info(`Avatar créé avec succès: ${fileAttachment.filename}`);
        }
      } catch (fileError) {
        logger.error("Erreur lors de la création du FileAttachment:", fileError);
        // Supprimer le fichier uploadé en cas d'erreur
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ 
          error: "Erreur lors de la sauvegarde de l'avatar",
          details: fileError.message 
        });
      }
    }

    const { error } = updateUserSchema.validate(data);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérifier l'email s'il est modifié
    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: data.email } });
      if (existingUser) {
        return res.status(400).json({ error: "Cet email est déjà utilisé" });
      }
    }

    await user.update(data);

    // Log de modification (sans trigger)
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "UPDATE",
        entity: "User",
        entityId: user.id,
        details: `Utilisateur modifié: ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) {
      logger.warn("Erreur lors de la création du log d'audit:", auditError);
      // Ne pas faire échouer la mise à jour pour un problème d'audit
    }

    res.json({
      message: "Utilisateur mis à jour avec succès",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error("Erreur mise à jour utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    await user.update({ isActive: !user.isActive });

    // Log de changement de statut
    await AuditLog.create({
      userId: req.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      details: `Statut utilisateur modifié: ${user.email} - ${
        user.isActive ? "Activé" : "Désactivé"
      }`,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({
      message: `Utilisateur ${
        user.isActive ? "activé" : "désactivé"
      } avec succès`,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    logger.error("Erreur changement statut utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const deleteAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    if (!user.avatar) return res.status(400).json({ error: "Aucun avatar à supprimer" });
    // Supprimer le fichier du disque
    const filePath = path.join(__dirname, "..", user.avatar);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await user.update({ avatar: null });
    res.json({ message: "Avatar supprimé" });
  } catch (error) {
    logger.error("Erreur suppression avatar:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    // Supprimer tous les avatars et fichiers associés
    const attachments = await FileAttachment.findAll({ where: { userId: user.id } });
    for (const attachment of attachments) {
      if (attachment.path && fs.existsSync(attachment.path)) {
        try { fs.unlinkSync(attachment.path); } catch (e) { /* ignorer */ }
      }
      await attachment.destroy();
    }
    // Supprimer l’avatar direct si présent (sécurité)
    if (user.avatar) {
      const avatarPath = user.avatar.startsWith('/') ? user.avatar : path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(avatarPath)) {
        try { fs.unlinkSync(avatarPath); } catch (e) { /* ignorer */ }
      }
    }
    await user.destroy();
    // Log d’audit
    try {
      await AuditLog.create({
        userId: req.user.id,
        action: "DELETE",
        entity: "User",
        entityId: user.id,
        details: `Utilisateur supprimé: ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } catch (auditError) { logger.warn("Erreur log audit suppression:", auditError); }
    res.json({ message: "Utilisateur et fichiers associés supprimés" });
  } catch (error) {
    logger.error("Erreur suppression utilisateur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteAvatar,
  deleteUser,
};
