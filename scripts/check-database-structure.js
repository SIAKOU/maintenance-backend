const { sequelize } = require('../models');

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Vérification de la structure de la base de données...');
    
    // Vérifier si la table maintenance_schedules existe
    const maintenanceSchedulesExists = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'maintenance_schedules')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (!maintenanceSchedulesExists[0].exists) {
      console.log('❌ Table maintenance_schedules n\'existe pas');
      console.log('✅ Exécution de la migration...');
      
      // Exécuter la migration
      const { execSync } = require('child_process');
      execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
    } else {
      console.log('✅ Table maintenance_schedules existe');
    }
    
    // Vérifier si la colonne maintenance_schedule_id existe dans file_attachments
    const columnExists = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'file_attachments' AND column_name = 'maintenance_schedule_id')",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (!columnExists[0].exists) {
      console.log('❌ Colonne maintenance_schedule_id n\'existe pas dans file_attachments');
      console.log('✅ Ajout de la colonne...');
      
      await sequelize.query(
        'ALTER TABLE file_attachments ADD COLUMN maintenance_schedule_id INTEGER REFERENCES maintenance_schedules(id) ON DELETE CASCADE ON UPDATE CASCADE'
      );
      
      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_file_attachments_maintenance_schedule_id ON file_attachments(maintenance_schedule_id)'
      );
      
      console.log('✅ Colonne ajoutée avec succès');
    } else {
      console.log('✅ Colonne maintenance_schedule_id existe dans file_attachments');
    }
    
    // Vérifier les index
    const indexes = await sequelize.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'maintenance_schedules'",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('📊 Index existants sur maintenance_schedules:');
    indexes.forEach(index => {
      console.log(`  - ${index.indexname}`);
    });
    
    console.log('🎉 Vérification terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDatabaseStructure(); 