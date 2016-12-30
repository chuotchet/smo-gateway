"use strict";

module.exports = function(sequelize, DataTypes) {
  var Device = sequelize.define('Device', {
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mode: {
      type: DataTypes.STRING,
      defaultValue: 'auto',
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'off',
      allowNull: true
    },
    button: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: true
    },
    port: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status_port: {
      type: DataTypes.STRING,
      defaultValue: 'on',
      allowNull: true
    },
    temp: {
      type: DataTypes.STRING,
      defaultValue: '20',
      allowNull: true
    },
    time: {
      type: DataTypes.STRING,
      defaultValue: '08-00/17-00',
      allowNull: true
    },
    range: {
      type: DataTypes.STRING,
      defaultValue: '18/30',
      allowNull: true
    }
  }, {
    classMethods: {
      getDeviceByPort: function(port, callback){
        var query = {
          where: {
            port: port
          }
        };
        Device.findOne(query).then(callback);
      }
      // associate: function(models){
      //   User.belongsToMany(models.Course, {through: models.Feedback});
      // }
    },
    tableName: 'device'
  });
  return Device;
};
