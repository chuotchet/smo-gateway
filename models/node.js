"use strict";

module.exports = function(sequelize, DataTypes) {
  var Node = sequelize.define('Node', {
    N_MAC: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lux: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tem: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hum: {
      type: DataTypes.STRING,
      allowNull: true
    },
    turnOffAll: {
      type: DataTypes.STRING,
      defaultValue: 'on',
      allowNull: true
    }
  }, {
    classMethods: {
      getNodeByMAC: function(MAC, callback){
        var query = {
          where: {
            N_MAC: MAC
          }
        };
        Node.findOne(query).then(callback);
      },
      associate: function(models){
        Node.belongsToMany(models.Device, {through: 'NodeDevices'});
      }
    },
    tableName: 'node'
  });
  return Node;
};
