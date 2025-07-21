const express = require("express");
const { login, getProfile, logout } = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const { authRateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Route de login avec rate limiting
router.post("/login", authRateLimiter, login);

// Routes protégées nécessitant un token valide
router.get("/profile", authenticateToken, getProfile);

// Alias pour /profile
router.get("/me", authenticateToken, getProfile);

// Route de logout
router.post("/logout", authenticateToken, logout);

module.exports = router;
