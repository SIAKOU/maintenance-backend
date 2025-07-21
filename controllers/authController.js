const jwt = require("jsonwebtoken");
const { User, AuditLog } = require("../models");
const Joi = require("joi");
const logger = require("../logger");
const { getClientIp } = require("../utils");
const crypto = require("crypto");

// Configuration JWT par environnement
const JWT_CONFIG = {
  development: {
    expiresIn: "24h",
    algorithm: "HS256",
  },
  production: {
    expiresIn: "8h",
    algorithm: "HS256",
  },
  test: {
    expiresIn: "1h",
    algorithm: "HS256",
  },
};

// Configuration des cookies par environnement
const COOKIE_CONFIG = {
  development: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24h
    path: "/",
  },
  production: {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    domain: process.env.COOKIE_DOMAIN,
    maxAge: 8 * 60 * 60 * 1000, // 8h
    path: "/",
  },
  test: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 1000, // 1h
    path: "/",
  },
};

// Schéma de validation avec messages personnalisés
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "L'email doit être une adresse valide",
    "string.empty": "L'email est requis",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Le mot de passe doit contenir au moins 6 caractères",
    "string.empty": "Le mot de passe est requis",
  }),
}).options({ abortEarly: false });

// Limiteur de tentatives de connexion (déplacé dans les routes)

const login = async (req, res) => {
  try {
    // Validation des données
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }));
      logger.warn("Validation error", { errors, ip: getClientIp(req) });
      return res.status(400).json({
        success: false,
        error: "Erreur de validation",
        details: errors,
      });
    }

    const { email, password } = value;
    const clientIp = getClientIp(req);
    logger.info(`Tentative de connexion pour ${email}`, { ip: clientIp });

    // Recherche de l'utilisateur avec le mot de passe
    const user = await User.findOne({
      where: { email },
      attributes: { include: ["password"] },
    });

    if (!user || !user.isActive) {
      logger.warn(
        "Tentative de connexion échouée - Utilisateur non trouvé ou inactif",
        {
          email,
          ip: clientIp,
        }
      );
      return res.status(401).json({
        success: false,
        error: "Identifiants incorrects",
      });
    }

    // Vérification du mot de passe
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      logger.warn("Tentative de connexion échouée - Mot de passe incorrect", {
        email,
        ip: clientIp,
      });
      return res.status(401).json({
        success: false,
        error: "Identifiants incorrects",
      });
    }

    // Mise à jour de la dernière connexion
    await user.update({
      lastLogin: new Date(),
      loginIp: clientIp,
    });

    // Génération du token JWT
    const env = process.env.NODE_ENV || "development";
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      sessionId: crypto.randomUUID(),
      env: env,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      JWT_CONFIG[env]
    );

    // Journalisation de la connexion
    await AuditLog.create({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      ipAddress: clientIp,
      userAgent: req.get("User-Agent"),
      metadata: {
        sessionId: tokenPayload.sessionId,
        env: env,
      },
    });

    // Configuration du cookie adaptée à l'environnement
    res.cookie("token", token, COOKIE_CONFIG[env]);

    // Réponse avec token dans tous les environnements
    logger.info("Connexion réussie", {
      userId: user.id,
      email: user.email,
      env: env,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token: token,
      expiresIn: JWT_CONFIG[env].expiresIn,
    });
  } catch (error) {
    logger.error("Erreur lors de la connexion", {
      error: error.message,
      stack: error.stack,
      ip: getClientIp(req),
    });
    res.status(500).json({
      success: false,
      error: "Une erreur est survenue lors de la connexion",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    // Récupérer les informations à jour de l'utilisateur
    const currentUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: "Utilisateur non trouvé",
      });
    }

    res.json({
      success: true,
      user: {
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        role: currentUser.role,
        phone: currentUser.phone,
        avatar: currentUser.avatar,
        lastLogin: currentUser.lastLogin,
      },
    });
  } catch (error) {
    logger.error("Erreur lors de la récupération du profil", {
      userId: req.user?.id,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: "Une erreur est survenue lors de la récupération du profil",
    });
  }
};

const logout = async (req, res) => {
  try {
    const env = process.env.NODE_ENV || "development";
    const clientIp = getClientIp(req);

    // Journalisation de la déconnexion
    if (req.user) {
      await AuditLog.create({
        userId: req.user.id,
        action: "LOGOUT",
        entity: "User",
        entityId: req.user.id,
        ipAddress: clientIp,
        userAgent: req.get("User-Agent"),
        metadata: {
          env: env,
        },
      });
    }

    // Suppression du cookie
    res.clearCookie("token", COOKIE_CONFIG[env]);

    res.json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    logger.error("Erreur lors de la déconnexion", {
      userId: req.user?.id,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: "Une erreur est survenue lors de la déconnexion",
    });
  }
};

module.exports = {
  login,
  getProfile,
  logout,
};
