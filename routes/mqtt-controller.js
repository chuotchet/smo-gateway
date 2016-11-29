var mqtt = require('mqtt');
var models = require('../models');
var strToByte = require('./strToByte.js');
var broker = require('../config/brokerurl.json');
var g_mac = require('../config/token.json').G_MAC;
console.log(g_mac);
//var g_mac = 'ccsmo';
var client  = mqtt.connect(broker.URL);

var SerialPort = require('serialport');
var xbee_api = require('xbee-api');

var C = xbee_api.constants;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});

var serialport = new SerialPort("COM3", {
  baudrate: 9600,
  parser: xbeeAPI.rawParser()
});

var timeCheck = function(now,time,callback){
  var h = now.getHours();
  var m = now.getMinutes();
  time = time.split('/');
  var min = time[0].split('-');
  var max = time[1].split('-');
  if( ((h>min[0])||(h==min[0]&&m>=min[1])) &&  ((h<max[0])||(h==max[0]&&m==max[1])) ){
    callback(true);
  }
  else callback(false);
}

var sendXbee = function(dataXbee,MAC){
  var frame_obj = {
    type: 0x10, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
    id: 0x00, // optional, nextFrameId() is called per default
    destination64: MAC,
    destination16: "fffe", // optional, "fffe" is default
    broadcastRadius: 0x00, // optional, 0x00 is default
    options: 0x00, // optional, 0x00 is default
    data: dataXbee // Can either be string or byte array.
  }
  serialport.write(xbeeAPI.buildFrame(frame_obj));
}

serialport.on("open", function() {
  console.log('open serialport!');
});

xbeeAPI.on("frame_object", function(frame) {
  console.log('receive xbee frame');
  console.log(frame);
    if(frame.type == C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET){ //receive
      var message = frame.data;
      var MAC = frame.remote64;
      if (message[0]==0x05){ //sensor
        updateNodeInfo(message, MAC);
      }
      if (message[0]==0x01){ //add
        //??TODO
        console.log('Add node successfully!');
      }
      if (message[0]==0x02){ //control
        updateDeviceInfo(message, MAC);
      }
      if (message[0]==0x03){ //button
        updateDeviceInfo(message, MAC);
      }
      if (message[0]==0x04){ //portstatus
        updatePortStatus(message, MAC);
      }
      if (message[0]==0x06){ //update
        updateDeviceInfo(message, MAC);
      }
    }
});

client.on('connect', function(){
  console.log('connected to mqtt broker!');
  client.subscribe(g_mac+'/#');
});


client.on('message', function(topic, message){
  message = JSON.parse(message);
  console.log(message);
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
    controlDevice(topic, message);
  }
  if (message.request=='changeMode'){
    changeMode(topic, message);
  }
  if (message.request=='turnOffAll'){
    turnOffAll(topic);
  }
  if (message.request=='controlPort'){
    controlPort(topic, message);
  }
  if (message.request=='controlAir'){
    controlAir(topic, message);
  }
  if (message.request=='controlAuto'){
    controlAuto(topic, message);
  }
});

var addNode = function(MAC){
  var dataXbee = [0x01];
  sendXbee(dataXbee, MAC);
}

var updateNodeInfo = function(message, MAC){
  console.log('updateNodeInfo');
  models.Node.getNodeByMAC(MAC, function(node){
    node.tem = message[1].toString();
    node.hum = message[2].toString();
    node.lux = (message[3]*16*16+message[4]).toString();
    node.save().then(function(){
      returnData(g_mac+'/'+MAC);
    });
    node.getDevices({
      where: {
        mode: 'auto'
      }
    }).then(function(devs){
      var now = new Date();
      var dataXbee = [0x02];
      for(i=0;i<devs.length;i++){
        timeCheck(now,devs[i].time, function(isTrue){
          if(isTrue){
            var range = devs[i].range.split('/')
            if(devs[i].type=='fan'){ //quat
              if(node.tem<range[0]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0x00); //or 0xff
                sendXbee(dataXbee,MAC);
              }
              else if(node.tem>range[1]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0xff); //or 0xff
                sendXbee(dataXbee,MAC);
              }
            }
            if(devs[i].type=='light'){ //den
              if(node.lux<range[0]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0xff); //or 0xff
                sendXbee(dataXbee,MAC);
              }
              else if(node.lux>range[1]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0x00); //or 0xff
                sendXbee(dataXbee,MAC);
              }
            }
            if(devs[i].type=='condition'){ //maylanh

            }
          }
        });
      }
    });
  });
}

var updateDeviceInfo = function(message, MAC){
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where: {
        port: message[1].toString()
      }
    }).then(function(dev){
      dev = dev[0];
      if(message[0]==0x03){
        console.log(message[2].toString());
        dev.button = message[2].toString();
      }
      if(message[0]==0x02){
        dev.status = (message[2]==0x00)?'off':'on';
      }
      dev.save().then(function(){
        returnData(g_mac+'/'+MAC);
      });
    });
  });
}

var updatePortStatus = function(message, MAC){
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices().then(function(devs){
      for(i=0;i<devs.length;i++){
        devs[i].status = (message[devs[i].port.toString()]==0x00)?'off':'on';
        devs[i].save();
      }
    });
  });
}

var returnData = function(topic){
  var MAC = topic.split('/')[1];
  models.Node.findOrCreate({where: {N_MAC:MAC}}).spread(function(node,created){
    if (created){
      console.log('Add new node to db!');
      addNode(MAC);
    }
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
  if(message.data.button){
    var dataXbee = [0x03];
    dataXbee.push(parseInt(message.data.port));
    dataXbee.push(parseInt(message.data.button));
    sendXbee(dataXbee,MAC);
  }

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
  if(message.data.button){
    var dataXbee = [0x03];
    dataXbee.push(parseInt(message.data.port));
    dataXbee.push(parseInt(message.data.button));
    sendXbee(dataXbee,MAC);
  }
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      dev[0].type = message.data.type;
      dev[0].name = message.data.name;
      dev[0].button = message.data.button;
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
  var dataXbee = [0x02];
  dataXbee.push(parseInt(message.data.port));
  dataXbee.push((message.data.status=='off')?0x00:0xff);
  sendXbee(dataXbee,MAC);

  //TODO: database
  // models.Node.getNodeByMAC(MAC, function(node){
  //   node.getDevices({
  //     where:{
  //       port: message.data.port
  //     }
  //   }).then(function(dev){
  //     dev[0].status = message.data.status;
  //     dev[0].save().then(function(){
  //       returnData(topic);
  //     });
  //   });
  // });
}

var changeMode = function(topic, message){
  var MAC = topic.split('/')[1];
  //TODO: xbee

  //TODO: database
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      dev[0].mode = message.data.mode;
      dev[0].save().then(function(){
        returnData(topic);
      });
    });
  });
}

var turnOffAll = function(topic){
  console.log('turnOffAll');
  var MAC = topic.split('/')[1];
  models.Node.getNodeByMAC(MAC,function(node){
    node.getDevices().then(function(devs){
      for(i=0;i<devs.length;i++){
        var dataXbee = [0x02];
        dataXbee.push(parseInt(devs[i].port));
        dataXbee.push(0x00);
        sendXbee(dataXbee,MAC);
      }
    });
  });

}

var controlPort = function(topic, message){
  var MAC = topic.split('/')[1];
  //TODO: xbee

  //TODO: database
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      dev[0].status_port = message.data.status_port;
      dev[0].save().then(function(){
        returnData(topic);
      });
    });
  });
}

var controlAir = function(topic, message){
  var MAC = topic.split('/')[1];
  //TODO: xbee

  //TODO: database
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      dev[0].temp = message.data.temp;
      dev[0].save().then(function(){
        returnData(topic);
      });
    });
  });
}

var controlAuto = function(topic, message){
  var MAC = topic.split('/')[1];
  //TODO: xbee

  //TODO: database
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      dev[0].time = message.data.time;
      dev[0].range = message.data.range;
      dev[0].save().then(function(){
        returnData(topic);
      });
    });
  });
}



module.exports = returnData;
