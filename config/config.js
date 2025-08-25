require('dotenv').config();

// Validation stricte des variables d'environnement critiques
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Variable d'environnement manquante: ${varName}`);
  }
});

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log, // Affiche les requêtes SQL en dev
    pool: {
      max: 5,    // nombre maximum de connexions dans le pool
      min: 0,    // nombre minimum
      acquire: 30000, // temps max (ms) pour tenter d'obtenir une connexion
      idle: 10000     // temps max (ms) qu'une connexion peut rester inactive
    }
  },

  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // pas besoin en test
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // désactive les logs SQL en prod
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
};
