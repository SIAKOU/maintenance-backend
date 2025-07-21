module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    "Report",
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
      workDate: {
        field: "work_date",
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      startTime: {
        field: "start_time",
        type: DataTypes.TIME,
        allowNull: false,
      },
      endTime: {
        field: "end_time",
        type: DataTypes.TIME,
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
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
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      workType: {
        field: "work_type",
        type: DataTypes.ENUM(
          "maintenance",
          "repair",
          "inspection",
          "installation",
          "other"
        ),
        allowNull: false,
      },
      problemDescription: {
        field: "problem_description",
        type: DataTypes.TEXT,
        allowNull: false,
      },
      actionsTaken: {
        field: "actions_taken",
        type: DataTypes.TEXT,
        allowNull: false,
      },
      partsUsed: {
        field: "parts_used",
        type: DataTypes.JSONB,
      },
      toolsUsed: {
        field: "tools_used",
        type: DataTypes.JSONB,
      },
      observations: {
        type: DataTypes.TEXT,
      },
      recommendations: {
        type: DataTypes.TEXT,
      },
      status: {
        type: DataTypes.ENUM("draft", "submitted", "reviewed", "approved"),
        allowNull: false,
        defaultValue: "draft",
      },
      reviewedBy: {
        field: "reviewed_by",
        type: DataTypes.INTEGER,
        references: {
          model: "users",
          key: "id",
        },
      },
      reviewedAt: {
        field: "reviewed_at",
        type: DataTypes.DATE,
      },
      reviewNotes: {
        field: "review_notes",
        type: DataTypes.TEXT,
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
        defaultValue: "medium",
      },
    },
    {
      tableName: "reports",
      underscored: true,
      timestamps: true,
    }
  );

  return Report;
};
