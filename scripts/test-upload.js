const fs = require('fs');
const path = require('path');

// Test du système d'upload
console.log('🧪 Test du système d\'upload...');

// Vérifier que les dossiers existent
const uploadDirs = ['uploads', 'uploads/avatars', 'uploads/machines', 'uploads/reports'];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Dossier créé: ${dir}`);
  } else {
    console.log(`✅ Dossier existe: ${dir}`);
  }
});

// Vérifier les permissions
uploadDirs.forEach(dir => {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    console.log(`✅ Permissions OK: ${dir}`);
  } catch (error) {
    console.error(`❌ Problème de permissions: ${dir}`);
  }
});

// Créer un fichier de test
const testFile = path.join('uploads', 'test.txt');
try {
  fs.writeFileSync(testFile, 'Test upload system');
  console.log('✅ Fichier de test créé');
  fs.unlinkSync(testFile);
  console.log('✅ Fichier de test supprimé');
} catch (error) {
  console.error('❌ Erreur lors du test de fichier:', error.message);
}

console.log('🎉 Test terminé !'); 