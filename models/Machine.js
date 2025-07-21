module.exports = (sequelize, DataTypes) => {
  const Machine = sequelize.define(
    "Machine",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 100],
        },
      },
      reference: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      brand: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          len: {
            args: [2, 50],
            msg: "Brand must be at least 2 characters if provided",
          },
        },
      },
      model: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          len: {
            args: [2, 50],
            msg: "Model must be at least 2 characters if provided",
          },
        },
      },
      serialNumber: {
        field: "serial_number",
        type: DataTypes.STRING(100),
        unique: true,
      },
      location: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 100],
        },
      },
      department: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      installationDate: {
        field: "installation_date",
        type: DataTypes.DATE,
      },
      warrantyEndDate: {
        field: "warranty_end_date",
        type: DataTypes.DATE,
      },
      status: {
        type: DataTypes.ENUM(
          "operational",
          "maintenance",
          "breakdown",
          "retired"
        ),
        allowNull: false,
        defaultValue: "operational",
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
        defaultValue: "medium",
      },
      maintenanceSchedule: {
        field: "maintenance_schedule",
        type: DataTypes.STRING(20),
      },
      lastMaintenanceDate: {
        field: "last_maintenance_date",
        type: DataTypes.DATE,
      },
      nextMaintenanceDate: {
        field: "next_maintenance_date",
        type: DataTypes.DATE,
      },
      image: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "Chemin de la photo de la machine",
      },
    },
    {
      tableName: "machines",
      underscored: true,
      timestamps: true,
    }
  );

  return Machine;
};
