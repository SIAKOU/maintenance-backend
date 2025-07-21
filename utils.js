/**
 * Utilitaires pour l'application
 */

/**
 * Obtient l'adresse IP réelle du client
 * @param {Object} req - Objet de requête Express
 * @returns {string} Adresse IP du client
 */
const getClientIp = (req) => {
  // Vérifier les headers proxy en premier
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Prendre la première IP de la liste
    return forwardedFor.split(',')[0].trim();
  }

  // Vérifier les autres headers proxy
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // Utiliser l'IP directe si disponible
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  // Fallback sur req.ip (Express)
  return req.ip || 'unknown';
};

/**
 * Valide une adresse email
 * @param {string} email - Email à valider
 * @returns {boolean} True si l'email est valide
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Génère un nom de fichier unique
 * @param {string} originalName - Nom original du fichier
 * @param {string} prefix - Préfixe optionnel
 * @returns {string} Nom de fichier unique
 */
const generateUniqueFileName = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const name = originalName.split('.').slice(0, -1).join('.');
  
  return `${prefix}${name}_${timestamp}_${random}.${extension}`;
};

/**
 * Formate une date pour l'affichage
 * @param {Date|string} date - Date à formater
 * @param {string} locale - Locale pour le formatage
 * @returns {string} Date formatée
 */
const formatDate = (date, locale = 'fr-FR') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formate une durée en heures et minutes
 * @param {number} minutes - Durée en minutes
 * @returns {string} Durée formatée
 */
const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0h 0min';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}min`;
  }
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * Valide un numéro de téléphone français
 * @param {string} phone - Numéro de téléphone à valider
 * @returns {boolean} True si le numéro est valide
 */
const isValidPhone = (phone) => {
  if (!phone) return true; // Optionnel
  
  // Supprimer les espaces et caractères spéciaux
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Regex pour les numéros français (fixe et mobile)
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  
  return phoneRegex.test(cleanPhone);
};

/**
 * Nettoie et valide une chaîne de caractères
 * @param {string} str - Chaîne à nettoyer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Chaîne nettoyée
 */
const sanitizeString = (str, maxLength = 255) => {
  if (!str) return '';
  
  // Supprimer les caractères dangereux
  let cleaned = str
    .replace(/[<>]/g, '') // Supprimer < et >
    .replace(/javascript:/gi, '') // Supprimer javascript:
    .trim();
  
  // Limiter la longueur
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  
  return cleaned;
};

/**
 * Crée un objet de pagination
 * @param {number} page - Page actuelle
 * @param {number} limit - Limite par page
 * @param {number} total - Total d'éléments
 * @returns {Object} Objet de pagination
 */
const createPagination = (page = 1, limit = 10, total = 0) => {
  const currentPage = Math.max(1, parseInt(page) || 1);
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit) || 10));
  const totalItems = Math.max(0, parseInt(total) || 0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  return {
    page: currentPage,
    limit: itemsPerPage,
    total: totalItems,
    pages: totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};

module.exports = {
  getClientIp,
  isValidEmail,
  generateUniqueFileName,
  formatDate,
  formatDuration,
  isValidPhone,
  sanitizeString,
  createPagination,
}; 