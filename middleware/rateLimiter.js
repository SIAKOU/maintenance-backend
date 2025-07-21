const rateLimit = require("express-rate-limit");

/**
 * Crée un limiteur de taux personnalisé
 * @param {Object} options - Options de configuration
 * @param {number} options.windowMs - Fenêtre de temps en millisecondes
 * @param {number} options.max - Nombre maximum de requêtes
 * @param {string} options.message - Message d'erreur
 * @param {Function} options.keyGenerator - Fonction pour générer la clé
 * @returns {Function} Middleware de limitation de taux
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes par défaut
    max = 100, // 100 requêtes par défaut
    message = "Trop de requêtes depuis cette IP, réessayez plus tard.",
    keyGenerator = (req) => req.ip,
    ...otherOptions
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    ...otherOptions,
  });
};

/**
 * Limiteur de taux pour l'authentification
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives de connexion
  message: "Trop de tentatives de connexion. Veuillez réessayer plus tard.",
  keyGenerator: (req) => req.ip,
});

/**
 * Limiteur de taux pour les API générales
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes
  message: "Trop de requêtes depuis cette IP, réessayez plus tard.",
  keyGenerator: (req) => req.ip,
});

/**
 * Limiteur de taux pour les uploads de fichiers
 */
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 uploads par heure
  message: "Trop d'uploads de fichiers. Veuillez réessayer plus tard.",
  keyGenerator: (req) => req.ip,
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
}; 