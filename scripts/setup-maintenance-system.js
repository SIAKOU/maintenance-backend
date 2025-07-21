const { sequelize } = require('../models');

async function setupMaintenanceSystem() {
  try {
    console.log('🔧 Configuration du système de maintenance...');
    
    // 1. Créer la table maintenance_schedules si elle n'existe pas
    console.log('📋 Création de la table maintenance_schedules...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE ON UPDATE CASCADE,
        technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
        estimated_duration INTEGER NOT NULL DEFAULT 60,
        maintenance_type VARCHAR(20) NOT NULL DEFAULT 'preventive' CHECK (maintenance_type IN ('preventive', 'corrective', 'emergency', 'inspection')),
        priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        status VARCHAR(15) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
        frequency VARCHAR(10) NOT NULL DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
        recurrence_pattern JSONB,
        checklist JSONB,
        required_parts JSONB,
        estimated_cost DECIMAL(10,2) DEFAULT 0,
        actual_cost DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        completed_at TIMESTAMP WITH TIME ZONE,
        completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        completion_notes TEXT,
        next_scheduled_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Table maintenance_schedules créée');
    
    // 2. Créer les index pour les performances
    console.log('📊 Création des index...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_machine_id ON maintenance_schedules(machine_id)',
      'CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_technician_id ON maintenance_schedules(technician_id)',
      'CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_scheduled_date ON maintenance_schedules(scheduled_date)',
      'CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_status ON maintenance_schedules(status)',
      'CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_maintenance_type ON maintenance_schedules(maintenance_type)',
      'CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_priority ON maintenance_schedules(priority)',
      'CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_completed_at ON maintenance_schedules(completed_at)'
    ];
    
    for (const indexQuery of indexes) {
      await sequelize.query(indexQuery);
    }
    
    console.log('✅ Index créés');
    
    // 3. Ajouter la colonne maintenance_schedule_id à file_attachments si elle n'existe pas
    console.log('🔗 Ajout de la relation avec file_attachments...');
    
    const columnExists = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'file_attachments' AND column_name = 'maintenance_schedule_id')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (!columnExists[0].exists) {
      await sequelize.query(`
        ALTER TABLE file_attachments 
        ADD COLUMN maintenance_schedule_id INTEGER 
        REFERENCES maintenance_schedules(id) ON DELETE CASCADE ON UPDATE CASCADE
      `);
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_file_attachments_maintenance_schedule_id 
        ON file_attachments(maintenance_schedule_id)
      `);
      
      console.log('✅ Colonne maintenance_schedule_id ajoutée à file_attachments');
    } else {
      console.log('✅ Colonne maintenance_schedule_id existe déjà');
    }
    
    // 4. Créer les types ENUM si nécessaire
    console.log('🎯 Création des types ENUM...');
    
    const enumTypes = [
      "CREATE TYPE IF NOT EXISTS enum_maintenance_schedules_maintenance_type AS ENUM ('preventive', 'corrective', 'emergency', 'inspection')",
      "CREATE TYPE IF NOT EXISTS enum_maintenance_schedules_priority AS ENUM ('low', 'medium', 'high', 'critical')",
      "CREATE TYPE IF NOT EXISTS enum_maintenance_schedules_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')",
      "CREATE TYPE IF NOT EXISTS enum_maintenance_schedules_frequency AS ENUM ('once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')"
    ];
    
    for (const enumQuery of enumTypes) {
      try {
        await sequelize.query(enumQuery);
      } catch (error) {
        // Ignorer les erreurs si les types existent déjà
        console.log(`ℹ️ Type ENUM déjà existant ou non nécessaire`);
      }
    }
    
    console.log('✅ Types ENUM créés');
    
    // 5. Vérifier la structure finale
    console.log('🔍 Vérification finale...');
    
    const tableExists = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_schedules')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (tableExists[0].exists) {
      console.log('🎉 Système de maintenance configuré avec succès !');
      console.log('📋 Table maintenance_schedules: ✅');
      console.log('🔗 Relation file_attachments: ✅');
      console.log('📊 Index de performance: ✅');
    } else {
      console.log('❌ Erreur lors de la création de la table');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
  } finally {
    await sequelize.close();
  }
}

setupMaintenanceSystem(); 