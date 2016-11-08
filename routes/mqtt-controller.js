var mqtt = require('mqtt');
var models = require('../models');
var strToByte = require('./strToByte.js');
var broker = require('../config/brokerurl.json');
var client  = mqtt.connect(broker.URL);

//var xbee = require('./xbee-controller.js')
client.on('connect', function(){
  console.log('connected to mqtt broker!');
  client.subscribe('qwerty/#');
});

client.on('reconnect', function(){
  console.log('restart connection');
});

client.on('message', function(topic, message){
  console.log(message);
  message = JSON.parse(message);
  var node = topic.split('/')[1];
  if (message.request=='getData'){
    returnData(topic);
  }
  if (message.request=='addDevice'){
    addDevice(topic, message);
  }
  if (message.request=='editDevice'){
    editDevice(topic, message);
  }
  if (message.request=='deleteDevice'){
    deleteDevice(topic, message);
  }
  if (message.request=='controlDevice'){

  }
  if (message.request=='changeMode'){

  }
  if (message.request=='turnOffAll'){

  }
  if (message.request=='controlPort'){

  }
});

var returnData = function(topic){
  var MAC = topic.split('/')[1];
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices().then(function(devs){
      var dataSend = {
        success:true,
        lux: node.lux,
        tem: node.tem,
        hum: node.hum,
        source: 'gateway',
        turnOffAll: node.turnOffAll,
        data: {
          devices: devs
        }
      }
      client.publish(topic+'/g',JSON.stringify(dataSend));
    });
  });
}

var addDevice = function(topic, message){
  var MAC = topic.split('/')[1];
  models.Node.getNodeByMAC(MAC, function(node){
    var data = {
      type: message.data.type,
      name: message.data.name,
      button: message.data.button,
      port: message.data.port
    }
    models.Device.create(data).then(function(dev){
      node.addDevice(dev).then(function(){
        //TODO: xbee send or sth?
        returnData(topic);
      });
    });
  });
}

var editDevice = function(topic, message){
  var MAC = topic.split('/')[1];
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      dev[0].type = message.data.type;
      dev[0].name = message.data.name;
      dev[0].button = message.data.button;
      dev[0].port = message.data.port;
      dev[0].save().then(function(){
        returnData(topic);
      });
    });
  });
}

var deleteDevice = function(topic, message){
  var MAC = topic.split('/')[1];
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      node.removeDevice(dev).then(function(){
        models.Device.destroy({
          where:{
            port: message.data.port
          }
        }).then(function(num){
          returnData(topic);
        });
      });
    });
  });
}

var controlDevice = function(topic, message){
  var MAC = topic.split('/')[1];
  //TODO: xbee

  //TODO: database

}

var changeMode = function(topic, message){
  var MAC = topic.split('/')[1];
  //TODO: xbee

  //TODO: database

}

var turnOffAll = function(topic, message){
  var MAC = topic.split('/')[1];
  //TODO: xbee

  //TODO: database

}



module.exports = returnData;
