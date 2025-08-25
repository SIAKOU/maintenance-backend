require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const os = require("os");
const morgan = require("morgan");
const db = require("./models");
const { authenticateToken } = require("./middleware/auth");

// Vérification stricte des variables d'environnement critiques
const requiredEnv = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET'
];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Variable d'environnement manquante : ${key}`);
    process.exit(1);
  }
});

// Classe d'erreur API personnalisée
class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

const cookieParser = require("cookie-parser");

// Configuration améliorée pour obtenir l'IP locale
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const LOCAL_IP = process.env.LOCAL_IP || getLocalIP();

// Liste des origines autorisées
const allowedOrigins = [
  `http://localhost:${PORT}`,
  `http://localhost:5173`,
  `http://127.0.0.1:${PORT}`,
  `http://127.0.0.1:5173`,
  `http://${LOCAL_IP}:${PORT}`,
  `http://${LOCAL_IP}:5173`,
  `http://${LOCAL_IP}:8081`,
  `http://192.150.24.44:${PORT}`,
  `http://192.150.24.44:5173`,
  `http://192.150.24.44:8081`,
  process.env.FRONTEND_URL, // URL du frontend en production
].filter(Boolean);

// Gestion CORS universelle pour réseau local et production sécurisée
const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser toutes les origines locales (localhost, 127.0.0.1, IP locale, réseau local)
    const localNetworkRegex = /^http:\/\/(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01]))\./;
    if (
      !origin ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes(LOCAL_IP) ||
      localNetworkRegex.test(origin)
    ) {
      return callback(null, true);
    }
    // En production, autoriser aussi FRONTEND_URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    // Sinon, refuser
    return callback(new Error("Accès non autorisé par la politique CORS"), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Authorization", "Set-Cookie"],
};

// Middlewares de base
app.use(helmet({
  // Autoriser le chargement des images depuis une autre origine (frontend sur 5173/8081)
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Eviter de bloquer certaines intégrations (prévisualisations, popups auth)
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  // Désactiver COEP qui peut bloquer des ressources tierces et workers si mal configuré
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Limitation du taux de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // Plus permissif en développement
  message: "Trop de requêtes depuis cette IP, réessayez plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Correction: gestion robuste des fichiers statiques et des types MIME
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(__dirname, 'uploads', req.path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier non trouvé' });
  }
  next();
}, express.static(path.join(__dirname, "uploads"), {
  maxAge: process.env.NODE_ENV === "production" ? "7d" : "0",
  setHeaders: (res) => {
    // Permettre l’affichage cross-origin des images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Correction: extension de la gestion des types MIME
app.get('/api/files/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
    };
    // Téléchargement sécurisé avec content-disposition
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du fichier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Middleware pour logger les requêtes entrantes (en développement seulement)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    console.log(`🌐 Origin: ${req.headers.origin}`);
    console.log(`🍪 Cookies: ${JSON.stringify(req.cookies)}`);
    next();
  });
}

// Routes API
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/users", require("./routes/users"));
app.use("/api/machines", require("./routes/machines"));
app.use("/api/maintenance-schedules", require("./routes/maintenanceSchedules"));

// Route de santé
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    env: process.env.NODE_ENV,
  });
});

// Route de vérification de configuration
app.get("/api/config-check", (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET ? "configured" : "missing",
    dbConnected: !!db.sequelize,
    corsOrigins: allowedOrigins,
    cookieSettings: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
    },
  });
});

// Middleware de gestion d'erreurs amélioré
app.use((error, req, res, next) => {
  console.error("Erreur serveur:", error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "Fichier trop volumineux (max 10MB)" });
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Type de fichier non autorisé" });
  }

  if (error.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Authentification requise" });
  }

  // Erreur API personnalisée
  if (error instanceof ApiError) {
    return res.status(error.status || 500).json({
      error: error.message,
      details: error.details,
    });
  }

  res.status(500).json({
    error: "Erreur serveur interne",
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
});

// Route 404 améliorée
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route non trouvée",
    path: req.path,
    method: req.method,
    availableEndpoints: [
      "/api/auth",
      "/api/reports",
      "/api/users",
      "/api/machines",
      "/api/health",
      "/api/config-check",
    ],
  });
});

// Classe d'erreur API personnalisée (déplacée en haut du fichier)

// Amélioration de l'affichage terminale

// Fonction de démarrage du serveur améliorée
const startServer = async () => {
  let chalk = null;
  try {
    chalk = await import('chalk').then(mod => mod.default);
  } catch (e) {
    // Fallback : pas de couleur si chalk non dispo
    chalk = {
      cyan: (s) => s, green: (s) => s, yellowBright: (s) => s, magentaBright: (s) => s,
      greenBright: (s) => s, blueBright: (s) => s, white: (s) => s, bgBlue: { white: { bold: (s) => s } },
      bgWhite: { black: { bold: (s) => s } }, bgGreen: { black: { bold: (s) => s } }, bgRed: { white: { bold: (s) => s } },
      bold: (s) => s
    };
  }
  try {
    console.log(chalk.cyan.bold("⏳ Tentative de connexion à la base de données..."));
    await db.sequelize.authenticate();
    console.log(chalk.green.bold("✅ Connexion à la base de données établie"));

    if (process.env.NODE_ENV !== "production") {
      console.log(chalk.cyan("⏳ Synchronisation des modèles de base de données..."));
      await db.sequelize.sync({ alter: true });
      console.log(chalk.green("✅ Modèles de base de données synchronisés"));
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(chalk.bgBlue.white.bold(`\n🚀 Serveur démarré sur le port ${PORT}`));
      console.log(chalk.yellowBright(`📡 Environnement: ${process.env.NODE_ENV || "development"}`));
      console.log(chalk.magentaBright("🌐 Le backend est accessible sur les adresses suivantes :"));
      // Affiche toutes les IP locales IPv4
      const interfaces = os.networkInterfaces();
      const shown = new Set();
      Object.values(interfaces).forEach(ifaces => {
        ifaces.forEach(iface => {
          if (iface.family === "IPv4" && !iface.internal && !shown.has(iface.address)) {
            shown.add(iface.address);
            console.log(chalk.greenBright(`   - http://${iface.address}:${PORT}`));
          }
        });
      });
      // Toujours afficher localhost
      console.log(chalk.greenBright(`   - http://localhost:${PORT}`));
      if (process.env.FRONTEND_URL) {
        console.log(chalk.blueBright(`🔒 Origine frontend autorisée (prod) : ${process.env.FRONTEND_URL}`));
      }
      console.log(chalk.cyan("\n📚 Points finaux API principaux :"));
      console.log(chalk.cyan("   - /api/auth"));
      console.log(chalk.cyan("   - /api/reports"));
      console.log(chalk.cyan("   - /api/users"));
      console.log(chalk.cyan("   - /api/machines"));
      console.log(chalk.cyan("   - /api/health (vérification de santé)"));
      console.log(chalk.cyan("   - /api/config-check (vérification de configuration)\n"));
      // Résumé sécurité
      console.log(chalk.bgWhite.black.bold("Résumé sécurité CORS :"));
      console.log(chalk.white("- Toutes les IPs du réseau local sont autorisées (192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)"));
      console.log(chalk.white("- localhost et 127.0.0.1 autorisés"));
      if (process.env.FRONTEND_URL) {
        console.log(chalk.white(`- Origine frontend autorisée en production : ${process.env.FRONTEND_URL}`));
      }
      console.log(chalk.white("- Toute autre origine sera refusée (CORS)"));
      console.log(chalk.bgGreen.black.bold("Prêt à recevoir des requêtes !"));
    });
  } catch (error) {
    console.error(chalk.bgRed.white.bold("❌ Erreur critique lors du démarrage du serveur:"), error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
