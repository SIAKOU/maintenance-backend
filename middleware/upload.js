
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Créer le dossier uploads s'il n'existe pas
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration des types de fichiers par catégorie
const FILE_CATEGORIES = {
  avatar: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    subdir: 'avatars',
    resize: { width: 300, height: 300, quality: 85 }
  },
  machine: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    subdir: 'machines',
    resize: { width: 800, height: 600, quality: 85 }
  },
  report: {
    allowedTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    subdir: 'reports',
    resize: { width: 1200, height: 800, quality: 85 }
  }
};

// Fonction pour déterminer la catégorie basée sur le fieldname
const getCategory = (fieldname) => {
  if (fieldname === 'avatar') return 'avatar';
  if (fieldname === 'machineImage' || fieldname === 'image') return 'machine';
  return 'report';
};

// Fonction pour redimensionner les images
const resizeImage = async (filePath, category) => {
  const config = FILE_CATEGORIES[category];
  if (!config.resize) return filePath;

  try {
    const resizedPath = filePath.replace(/\.[^/.]+$/, '_resized.jpg');
    await sharp(filePath)
      .resize(config.resize.width, config.resize.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: config.resize.quality })
      .toFile(resizedPath);

    // Supprimer l'original et renommer le redimensionné
    fs.unlinkSync(filePath);
    fs.renameSync(resizedPath, filePath);
    
    return filePath;
  } catch (error) {
    console.error('Erreur lors du redimensionnement:', error);
    return filePath;
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = getCategory(file.fieldname);
    const config = FILE_CATEGORIES[category];
    const dest = path.join(uploadDir, config.subdir);
    
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const category = getCategory(file.fieldname);
    
    // Nom de fichier basé sur la catégorie
    let filename;
    switch (category) {
      case 'avatar':
        filename = `avatar-${uniqueSuffix}${ext}`;
        break;
      case 'machine':
        filename = `machine-${uniqueSuffix}${ext}`;
        break;
      case 'report':
        filename = `report-${uniqueSuffix}${ext}`;
        break;
      default:
        filename = `file-${uniqueSuffix}${ext}`;
    }
    
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const category = getCategory(file.fieldname);
  const config = FILE_CATEGORIES[category];

  if (!config) {
    return cb(new Error('Catégorie de fichier non reconnue'), false);
  }

  if (!config.allowedTypes.includes(file.mimetype)) {
    return cb(new Error(`Type de fichier non autorisé pour ${category}. Types autorisés: ${config.allowedTypes.join(', ')}`), false);
  }

  cb(null, true);
};

// Middleware d'upload principal
const upload = multer({
  storage: storage,
  limits: {
    fileSize: Math.max(...Object.values(FILE_CATEGORIES).map(c => c.maxSize))
  },
  fileFilter: fileFilter
});

// Middleware spécialisé pour les avatars
const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: FILE_CATEGORIES.avatar.maxSize
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== 'avatar') {
      return cb(new Error('Champ avatar requis'), false);
    }
    fileFilter(req, file, cb);
  }
}).single('avatar');

// Middleware spécialisé pour les images de machines
const uploadMachineImage = multer({
  storage: storage,
  limits: {
    fileSize: FILE_CATEGORIES.machine.maxSize
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname !== 'machineImage') {
      return cb(new Error('Champ machineImage requis'), false);
    }
    fileFilter(req, file, cb);
  }
}).single('machineImage');

// Middleware pour les fichiers de rapports (multiple)
const uploadReportFiles = multer({
  storage: storage,
  limits: {
    fileSize: FILE_CATEGORIES.report.maxSize
  },
  fileFilter: fileFilter
}).array('files', 10); // Maximum 10 fichiers

// Middleware pour traiter les images après upload
const processUploadedFiles = async (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files || [req.file];
    const processedFiles = [];

    for (const file of files) {
      const category = getCategory(file.fieldname);
      
      // Redimensionner les images
      if (file.mimetype.startsWith('image/')) {
        try {
          file.path = await resizeImage(file.path, category);
        } catch (resizeError) {
          console.error('Erreur lors du redimensionnement:', resizeError);
          // Continuer sans redimensionnement
        }
      }

      // Ajouter les métadonnées
      file.category = category;
      file.uploadedBy = req.user?.id;
      
      processedFiles.push(file);
    }

    req.processedFiles = processedFiles;
    next();
  } catch (error) {
    console.error('Erreur dans processUploadedFiles:', error);
    next(error);
  }
};

// Middleware pour gérer les erreurs d'upload
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Fichier trop volumineux',
        details: 'La taille du fichier dépasse la limite autorisée'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Trop de fichiers',
        details: 'Le nombre de fichiers dépasse la limite autorisée'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Champ de fichier incorrect',
        details: 'Le nom du champ de fichier n\'est pas reconnu'
      });
    }
    return res.status(400).json({ 
      error: 'Erreur d\'upload',
      details: error.message
    });
  }
  
  if (error.message.includes('Type de fichier non autorisé')) {
    return res.status(400).json({ 
      error: 'Type de fichier non autorisé',
      details: error.message
    });
  }
  
  console.error('Erreur upload non gérée:', error);
  return res.status(500).json({ 
    error: 'Erreur serveur lors de l\'upload',
    details: 'Une erreur inattendue s\'est produite'
  });
};

// Fonction utilitaire pour supprimer un fichier
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
  }
  return false;
};

// Fonction pour obtenir l'URL publique d'un fichier
const getPublicUrl = (filePath) => {
  if (!filePath) return null;
  const relativePath = path.relative(uploadDir, filePath);
  return `/uploads/${relativePath}`;
};

module.exports = {
  upload,
  uploadAvatar,
  uploadMachineImage,
  uploadReportFiles,
  processUploadedFiles,
  handleUploadError,
  deleteFile,
  getPublicUrl,
  FILE_CATEGORIES
};