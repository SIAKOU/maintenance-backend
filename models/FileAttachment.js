module.exports = (sequelize, DataTypes) => {
  const FileAttachment = sequelize.define(
    "FileAttachment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      originalName: {
        field: "original_name",
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      path: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      mimetype: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM("image", "video", "document", "audio", "other"),
        allowNull: false,
        defaultValue: "other",
      },
      fileType: {
        field: "file_type",
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: "Type de fichier (avatar, machine, report)",
      },
      description: {
        type: DataTypes.STRING(255),
      },
      interventionId: {
        field: "intervention_id",
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "interventions",
          key: "id",
        },
      },
      reportId: {
        field: "report_id",
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "reports",
          key: "id",
        },
      },
      machineId: {
        field: "machine_id",
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "machines",
          key: "id",
        },
      },
      userId: {
        field: "user_id",
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      maintenanceScheduleId: {
        field: "maintenance_schedule_id",
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "maintenance_schedules",
          key: "id",
        },
      },
      uploadedBy: {
        field: "uploaded_by",
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "file_attachments",
      underscored: true,
      timestamps: true,
    }
  );

  return FileAttachment;
};
