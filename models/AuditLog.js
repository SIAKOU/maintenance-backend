module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        field: "user_id",
        type: DataTypes.INTEGER,
        allowNull: true, // Permettre null pour les opérations système
        references: {
          model: "users",
          key: "id",
        },
      },
      action: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      entity: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entityId: {
        field: "entity_id",
        type: DataTypes.INTEGER,
      },
      changes: {
        type: DataTypes.JSONB,
      },
      ipAddress: {
        field: "ip_address",
        type: DataTypes.STRING(45),
      },
      userAgent: {
        field: "user_agent",
        type: DataTypes.TEXT,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Données supplémentaires pour l'audit",
      },
    },
    {
      tableName: "audit_logs",
      underscored: true,
      timestamps: true,
      updatedAt: false, // car ton DDL n'a pas de updated_at pour audit_logs
    }
  );

  return AuditLog;
};
