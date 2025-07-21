require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'stanislas',
    database: process.env.DB_NAME || 'gestion_maintenance',
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
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'stanislas',
    database: process.env.DB_NAME_TEST || 'gestion_maintenance_test',
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
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'stanislas',
    database: process.env.DB_NAME || 'gestion_maintenance_prod',
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
