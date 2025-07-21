
# Backend - Système de Gestion de Maintenance

## 🚀 Installation et Configuration

### Prérequis
- Node.js >= 16.x
- PostgreSQL >= 13.x
- npm ou yarn

### Installation

1. **Clonez le projet et installez les dépendances**
```bash
cd backend
npm install
```

2. **Configuration de la base de données PostgreSQL**

Créez une base de données PostgreSQL :
```sql
-- Connectez-vous à PostgreSQL en tant que superutilisateur
sudo -u postgres psql

-- Créez l'utilisateur et la base de données
CREATE USER maintenance_user WITH PASSWORD 'your_password_here';
CREATE DATABASE maintenance_db OWNER maintenance_user;
GRANT ALL PRIVILEGES ON DATABASE maintenance_db TO maintenance_user;

-- Sortez de PostgreSQL
\q
```

3. **Configuration des variables d'environnement**

Copiez le fichier `.env.example` vers `.env` :
```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos paramètres :
```env
# Configuration PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maintenance_db
DB_USER=maintenance_user
DB_PASSWORD=your_password_here

# JWT Secret (générez une clé sécurisée)
JWT_SECRET=your_super_secret_jwt_key_here

# Configuration serveur
PORT=5000
NODE_ENV=development
```

4. **Initialisation de la base de données**
```bash
# Synchronisation des modèles (en développement)
npm run dev
```

5. **Démarrage du serveur**
```bash
# Développement avec rechargement automatique
npm run dev

# Production
npm start
```

Le serveur sera accessible à l'adresse : `http://localhost:5000`

## 📁 Structure du Projet

```
backend/
├── config/
│   └── database.js          # Configuration base de données
├── controllers/
│   ├── authController.js    # Authentification
│   └── reportController.js  # Gestion des rapports
├── middleware/
│   ├── auth.js              # Middleware d'authentification
│   └── upload.js            # Gestion des fichiers
├── models/
│   ├── index.js             # Configuration Sequelize
│   ├── User.js              # Modèle utilisateur
│   ├── Machine.js           # Modèle machine
│   ├── Intervention.js      # Modèle intervention
│   ├── Report.js            # Modèle rapport
│   ├── FileAttachment.js    # Modèle fichier joint
│   └── AuditLog.js          # Modèle log d'audit
├── routes/
│   ├── auth.js              # Routes authentification
│   └── reports.js           # Routes rapports
├── uploads/                 # Dossier fichiers uploadés
├── server.js                # Point d'entrée
├── package.json
└── README.md
```

## 🔐 Authentification

### Connexion
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@maintenance.com",
  "password": "password123"
}
```

### Profil utilisateur
```bash
GET /api/auth/profile
Authorization: Bearer <token>
```

## 📊 API Endpoints

### Rapports
- `GET /api/reports` - Liste des rapports
- `POST /api/reports` - Créer un rapport
- `GET /api/reports/:id` - Détails d'un rapport
- `PUT /api/reports/:id` - Modifier un rapport
- `PATCH /api/reports/:id/submit` - Soumettre un rapport

### Authentification
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

## 🛡️ Sécurité

- **JWT** : Authentification par tokens
- **Helmet.js** : Protection des headers HTTP
- **Rate Limiting** : Protection contre les attaques par déni de service
- **CORS** : Configuration des origines autorisées
- **Validation** : Validation des données avec Joi
- **Hachage** : Mots de passe hachés avec bcrypt

## 🗄️ Base de Données

### Modèles Principaux

- **Users** : Gestion des utilisateurs (admin, technicien, administration)
- **Machines** : Équipements industriels
- **Interventions** : Demandes et suivi des interventions
- **Reports** : Rapports de dépannage des techniciens
- **FileAttachments** : Fichiers joints (images, vidéos, documents)
- **AuditLogs** : Traçabilité des actions

### Relations

- Un utilisateur peut avoir plusieurs interventions assignées
- Une machine peut avoir plusieurs interventions
- Un rapport appartient à un technicien et une machine
- Les fichiers peuvent être attachés aux rapports ou interventions

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Tests avec couverture
npm run test:coverage
```

## 📝 Logs et Monitoring

Les logs sont gérés avec Winston et incluent :
- Erreurs serveur
- Tentatives de connexion
- Actions utilisateurs (audit trail)
- Requêtes API

## 🚀 Déploiement

### Avec Docker (optionnel)
```bash
# Construction de l'image
docker build -t maintenance-backend .

# Lancement avec docker-compose
docker-compose up -d
```

### Variables d'environnement pour la production
```env
NODE_ENV=production
DB_HOST=your_production_db_host
JWT_SECRET=your_very_secure_production_jwt_secret
```

## 🔧 Dépannage

### Erreurs courantes

1. **Erreur de connexion PostgreSQL**
   - Vérifiez que PostgreSQL est démarré
   - Vérifiez les paramètres de connexion dans `.env`

2. **Erreur JWT_SECRET**
   - Assurez-vous que JWT_SECRET est défini dans `.env`

3. **Erreur de permissions fichiers**
   - Vérifiez les permissions du dossier `uploads/`

### Logs de debugging
```bash
# Voir les logs en temps réel
tail -f logs/app.log

# Vérifier l'état de la base de données
npm run db:status
```

## 📚 Documentation API

Une fois le serveur démarré, la documentation Swagger est accessible à :
`http://localhost:5000/api/docs`

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request
