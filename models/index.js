const { Sequelize, DataTypes } = require("sequelize");
const config = require("../config/database.js");

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
  }
);

// Chargement des modèles
const User = require("./User")(sequelize, DataTypes);
const Machine = require("./Machine")(sequelize, DataTypes);
const Intervention = require("./Intervention")(sequelize, DataTypes);
const Report = require("./Report")(sequelize, DataTypes);
const FileAttachment = require("./FileAttachment")(sequelize, DataTypes);
const AuditLog = require("./AuditLog")(sequelize, DataTypes);
const MaintenanceSchedule = require("./MaintenanceSchedule")(sequelize, DataTypes);

// Associations

// Users
User.hasMany(Intervention, {
  foreignKey: "technician_id",
  as: "assignedInterventions",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
User.hasMany(Intervention, {
  foreignKey: "requester_id",
  as: "requestedInterventions",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.hasMany(Report, {
  foreignKey: "technician_id",
  as: "reports",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.hasMany(FileAttachment, {
  foreignKey: "uploaded_by",
  as: "uploadedFiles",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.hasMany(AuditLog, {
  foreignKey: "user_id",
  as: "auditLogs",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
User.hasMany(Report, {
  foreignKey: "reviewed_by",
  as: "reviewedReports",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Machines
Machine.hasMany(Intervention, {
  foreignKey: "machine_id",
  as: "interventions",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Machine.hasMany(Report, {
  foreignKey: "machine_id",
  as: "reports",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Machine.hasMany(MaintenanceSchedule, {
  foreignKey: "machine_id",
  as: "maintenanceSchedules",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Interventions
Intervention.belongsTo(User, {
  foreignKey: "technician_id",
  as: "technician",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Intervention.belongsTo(User, {
  foreignKey: "requester_id",
  as: "requester",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Intervention.belongsTo(Machine, {
  foreignKey: "machine_id",
  as: "machine",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Intervention.hasMany(FileAttachment, {
  foreignKey: "intervention_id",
  as: "attachments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Reports
Report.belongsTo(User, {
  foreignKey: "technician_id",
  as: "technician",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Report.belongsTo(Machine, {
  foreignKey: "machine_id",
  as: "machine",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Report.belongsTo(User, {
  foreignKey: "reviewed_by",
  as: "reviewer",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
Report.hasMany(FileAttachment, {
  foreignKey: "report_id",
  as: "attachments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Maintenance Schedules
MaintenanceSchedule.belongsTo(Machine, {
  foreignKey: "machine_id",
  as: "machine",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
MaintenanceSchedule.belongsTo(User, {
  foreignKey: "technician_id",
  as: "technician",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
MaintenanceSchedule.belongsTo(User, {
  foreignKey: "completed_by",
  as: "completedByUser",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});
MaintenanceSchedule.hasMany(FileAttachment, {
  foreignKey: "maintenance_schedule_id",
  as: "attachments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// File Attachments
FileAttachment.belongsTo(Intervention, {
  foreignKey: "intervention_id",
  as: "intervention",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
FileAttachment.belongsTo(Report, {
  foreignKey: "report_id",
  as: "report",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
FileAttachment.belongsTo(MaintenanceSchedule, {
  foreignKey: "maintenance_schedule_id",
  as: "maintenanceSchedule",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
FileAttachment.belongsTo(User, {
  foreignKey: "uploaded_by",
  as: "uploader",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Audit Logs
AuditLog.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Export
const db = {
  sequelize,
  Sequelize,
  User,
  Machine,
  Intervention,
  Report,
  FileAttachment,
  AuditLog,
  MaintenanceSchedule,
};

module.exports = db;
