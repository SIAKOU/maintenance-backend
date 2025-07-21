module.exports = (sequelize, DataTypes) => {
  const Intervention = sequelize.define(
    "Intervention",
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
        allowNull: false,
      },
      urgency: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
        defaultValue: "medium",
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "assigned",
          "in_progress",
          "completed",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      type: {
        type: DataTypes.ENUM("preventive", "corrective", "emergency"),
        allowNull: false,
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
      requesterId: {
        field: "requester_id",
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
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
      requestDate: {
        field: "request_date",
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      assignedDate: {
        field: "assigned_date",
        type: DataTypes.DATE,
      },
      startDate: {
        field: "start_date",
        type: DataTypes.DATE,
      },
      completedDate: {
        field: "completed_date",
        type: DataTypes.DATE,
      },
      estimatedDuration: {
        field: "estimated_duration",
        type: DataTypes.INTEGER, // minutes
      },
      actualDuration: {
        field: "actual_duration",
        type: DataTypes.INTEGER, // minutes
      },
      diagnosis: {
        type: DataTypes.TEXT,
      },
      solution: {
        type: DataTypes.TEXT,
      },
      partsUsed: {
        field: "parts_used",
        type: DataTypes.JSONB,
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: "interventions",
      underscored: true,
      timestamps: true,
    }
  );

  return Intervention;
};
