'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('maintenance_schedules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 200]
        }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      machine_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'machines',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      technician_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      estimated_duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: 'Durée estimée en minutes'
      },
      maintenance_type: {
        type: Sequelize.ENUM('preventive', 'corrective', 'emergency', 'inspection'),
        allowNull: false,
        defaultValue: 'preventive'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium'
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'),
        allowNull: false,
        defaultValue: 'scheduled'
      },
      frequency: {
        type: Sequelize.ENUM('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
        allowNull: false,
        defaultValue: 'once'
      },
      recurrence_pattern: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Configuration de récurrence pour les maintenances répétitives'
      },
      checklist: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Liste des tâches à effectuer'
      },
      required_parts: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Pièces nécessaires pour la maintenance'
      },
      estimated_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      actual_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      completion_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      next_scheduled_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de la prochaine maintenance (pour les récurrences)'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Ajout des index pour optimiser les performances
    await queryInterface.addIndex('maintenance_schedules', ['machine_id']);
    await queryInterface.addIndex('maintenance_schedules', ['technician_id']);
    await queryInterface.addIndex('maintenance_schedules', ['scheduled_date']);
    await queryInterface.addIndex('maintenance_schedules', ['status']);
    await queryInterface.addIndex('maintenance_schedules', ['maintenance_type']);
    await queryInterface.addIndex('maintenance_schedules', ['priority']);
    await queryInterface.addIndex('maintenance_schedules', ['completed_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('maintenance_schedules');
  }
}; 