
const jwt = require('jsonwebtoken');
const { User } = require('../models');



const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || (req.cookies && req.cookies.token);

  // Logs de debug seulement en développement
  if (process.env.NODE_ENV !== "production") {
    console.log('🔍 Auth Debug:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasCookie: !!(req.cookies && req.cookies.token),
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 10) + '...' : 'none'
    });
  }

  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.log('❌ Aucun token trouvé');
    }
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (process.env.NODE_ENV !== "production") {
      console.log('✅ Token décodé:', { userId: decoded.userId, role: decoded.role });
    }
    
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      if (process.env.NODE_ENV !== "production") {
        console.log('❌ Utilisateur non trouvé ou inactif:', { userId: decoded.userId, userFound: !!user, isActive: user?.isActive });
      }
      return res.status(401).json({ error: 'Utilisateur non trouvé ou inactif' });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log('✅ Utilisateur authentifié:', { id: user.id, email: user.email, role: user.role });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.log('❌ Erreur de vérification du token:', error.message);
    }
    return res.status(403).json({ error: 'Token invalide' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    next();
  };
};

module.exports = { authenticateToken, authorize };
