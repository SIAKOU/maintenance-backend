// scripts/setupEnv.js
const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function setupEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  const localIP = getLocalIP();
  console.log(`🖥️  Adresse IP locale détectée: ${localIP}`);

  // Mise à jour des variables
  envContent = envContent.replace(/LOCAL_IP=.*/g, `LOCAL_IP=${localIP}`);
  // Harmonisation avec le frontend: utiliser VITE_API_URL et VITE_BACKEND_URL
  envContent = envContent.replace(/VITE_API_BASE_URL=.*/g, "");
  if (!/VITE_API_URL=/.test(envContent)) {
    envContent += `\nVITE_API_URL=http://${localIP}:5000/api`;
  } else {
    envContent = envContent.replace(/VITE_API_URL=.*/g, `VITE_API_URL=http://${localIP}:5000/api`);
  }
  if (!/VITE_BACKEND_URL=/.test(envContent)) {
    envContent += `\nVITE_BACKEND_URL=http://${localIP}:5000`;
  } else {
    envContent = envContent.replace(/VITE_BACKEND_URL=.*/g, `VITE_BACKEND_URL=http://${localIP}:5000`);
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Fichier .env mis à jour avec les configurations réseau');
}

setupEnvironment();