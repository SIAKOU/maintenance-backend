'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modifier la contrainte pour permettre user_id NULL
    await queryInterface.changeColumn('audit_logs', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remettre la contrainte comme avant
    await queryInterface.changeColumn('audit_logs', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
}; 