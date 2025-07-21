'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ajouter les nouvelles colonnes à la table file_attachments
    await queryInterface.addColumn('file_attachments', 'file_type', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'other',
      comment: 'Type de fichier (avatar, machine, report)'
    });

    await queryInterface.addColumn('file_attachments', 'machine_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'machines',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addColumn('file_attachments', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Mettre à jour les enregistrements existants
    await queryInterface.sequelize.query(`
      UPDATE file_attachments 
      SET file_type = 'report' 
      WHERE report_id IS NOT NULL
    `);

    // Créer des index pour améliorer les performances
    await queryInterface.addIndex('file_attachments', ['file_type']);
    await queryInterface.addIndex('file_attachments', ['machine_id']);
    await queryInterface.addIndex('file_attachments', ['user_id']);
    await queryInterface.addIndex('file_attachments', ['category']);
  },

  down: async (queryInterface, Sequelize) => {
    // Supprimer les index
    await queryInterface.removeIndex('file_attachments', ['file_type']);
    await queryInterface.removeIndex('file_attachments', ['machine_id']);
    await queryInterface.removeIndex('file_attachments', ['user_id']);
    await queryInterface.removeIndex('file_attachments', ['category']);

    // Supprimer les colonnes
    await queryInterface.removeColumn('file_attachments', 'user_id');
    await queryInterface.removeColumn('file_attachments', 'machine_id');
    await queryInterface.removeColumn('file_attachments', 'file_type');
  }
}; 