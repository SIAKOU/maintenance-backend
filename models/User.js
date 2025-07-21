module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      firstName: {
        field: "first_name",
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 50],
        },
      },
      lastName: {
        field: "last_name",
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 50],
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: [6, 100],
        },
      },
      role: {
        type: DataTypes.ENUM("admin", "technician", "administration"),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(15),
        validate: {
          len: [10, 15],
        },
      },
      isActive: {
        field: "is_active",
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastLogin: {
        field: "last_login",
        type: DataTypes.DATE,
      },
      loginIp: {
        field: "login_ip",
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: "Dernière adresse IP de connexion",
      },
      avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: "Chemin de la photo de profil utilisateur",
      },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true, // gère created_at & updated_at automatiquement
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const bcrypt = require("bcryptjs");
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            const bcrypt = require("bcryptjs");
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
      },
    }
  );

  // Méthode d'instance pour vérifier le mot de passe
  User.prototype.validatePassword = async function (password) {
    const bcrypt = require("bcryptjs");
    return await bcrypt.compare(password, this.password);
  };

  // Supprimer le champ password à l'affichage
  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};
