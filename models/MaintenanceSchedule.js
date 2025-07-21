module.exports = (sequelize, DataTypes) => {
  const MaintenanceSchedule = sequelize.define(
    "MaintenanceSchedule",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 200],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      machineId: {
        field: "machine_id",
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "machines",
          key: "id",
        },
      },
      technicianId: {
        field: "technician_id",
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      scheduledDate: {
        field: "scheduled_date",
        type: DataTypes.DATE,
        allowNull: false,
      },
      estimatedDuration: {
        field: "estimated_duration",
        type: DataTypes.INTEGER, // en minutes
        allowNull: false,
        defaultValue: 60,
      },
      maintenanceType: {
        field: "maintenance_type",
        type: DataTypes.ENUM("preventive", "corrective", "emergency", "inspection"),
        allowNull: false,
        defaultValue: "preventive",
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
        defaultValue: "medium",
      },
      status: {
        type: DataTypes.ENUM("scheduled", "in_progress", "completed", "cancelled", "overdue"),
        allowNull: false,
        defaultValue: "scheduled",
      },
      frequency: {
        type: DataTypes.ENUM("once", "daily", "weekly", "monthly", "quarterly", "yearly"),
        allowNull: false,
        defaultValue: "once",
      },
      recurrencePattern: {
        field: "recurrence_pattern",
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Configuration de récurrence pour les maintenances répétitives",
      },
      checklist: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Liste des tâches à effectuer",
      },
      requiredParts: {
        field: "required_parts",
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Pièces nécessaires pour la maintenance",
      },
      estimatedCost: {
        field: "estimated_cost",
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      actualCost: {
        field: "actual_cost",
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      completedAt: {
        field: "completed_at",
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedBy: {
        field: "completed_by",
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      completionNotes: {
        field: "completion_notes",
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextScheduledDate: {
        field: "next_scheduled_date",
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Date de la prochaine maintenance (pour les récurrences)",
      },
    },
    {
      tableName: "maintenance_schedules",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          fields: ["machine_id"],
        },
        {
          fields: ["technician_id"],
        },
        {
          fields: ["scheduled_date"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["maintenance_type"],
        },
      ],
    }
  );

  MaintenanceSchedule.associate = (models) => {
    MaintenanceSchedule.belongsTo(models.Machine, {
      foreignKey: "machineId",
      as: "machine",
    });
    MaintenanceSchedule.belongsTo(models.User, {
      foreignKey: "technicianId",
      as: "technician",
    });
    MaintenanceSchedule.belongsTo(models.User, {
      foreignKey: "completedBy",
      as: "completedByUser",
    });
    MaintenanceSchedule.hasMany(models.FileAttachment, {
      foreignKey: "maintenanceScheduleId",
      as: "attachments",
    });
  };

  return MaintenanceSchedule;
}; 