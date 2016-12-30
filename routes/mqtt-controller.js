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

var serialport = new SerialPort("/dev/ttyUSB0", {
  baudrate: 9600,
  parser: xbeeAPI.rawParser()
});

var timeCheck = function(now,time,callback){
  var h = now.getHours();
  var m = now.getMinutes();
  time = time.split('/');
  var min = time[0].split('-');
  var max = time[1].split('-');
  min[0] = parseInt(min[0]);
  min[1] = parseInt(min[1]);
  max[0] = parseInt(max[0]);
  max[1] = parseInt(max[1]);
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
  console.log(frame_obj);
  serialport.write(xbeeAPI.buildFrame(frame_obj));
}

serialport.on("open", function() {
  console.log('open serialport!');
});

xbeeAPI.on("frame_object", function(frame) {
    if(frame.type == C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET){ //receive
      var message = frame.data;
      // console.log('frame_receive');
      // console.log(frame);
      var MAC = frame.remote64;
      if (message[0]==0x05){ //sensor
        updateNodeInfo(message, MAC);
      }
      if (message[0]==0x01){ //add
        //??TODO
        console.log('Add/Delete node successfully!');
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
  // console.log('message from mobile');
  // console.log(message);
  var node = topic.split('/')[1];
  if (message.request=='getData'){
    returnData(topic);
  }
  else if (message.request=='addDevice'){
    addDevice(topic, message);
  }
  else if (message.request=='editDevice'){
    editDevice(topic, message);
  }
  else if (message.request=='deleteDevice'){
    deleteDevice(topic, message);
  }
  else if (message.request=='controlDevice'){
    controlDevice(topic, message);
  }
  else if (message.request=='changeMode'){
    changeMode(topic, message);
  }
  else if (message.request=='turnOffAll'){
    turnOffAll(topic);
  }
  else if (message.request=='controlPort'){
    controlPort(topic, message);
  }
  else if (message.request=='controlAir'){
    controlAir(topic, message);
  }
  else if (message.request=='controlAuto'){
    controlAuto(topic, message);
  }
  else if (message.request=='deleteNode'){
    deleteNode(topic);
  }
});

var deleteNode = function(topic){
  turnOffAll(topic);
  setTimeout(function(){
    var dataXbee = [0x01, 0x00];
    sendXbee(dataXbee, MAC);
    var MAC = topic.split('/')[1];
    models.Node.getNodeByMAC(MAC, function(node){
      node.destroy();
      var message = {
        response: 'Node deleted'
      }
      client.publish(topic+'/s',JSON.stringify(message));
    });
  },4000);
}

var addNode = function(MAC){
  var dataXbee = [0x01, 0x01];
  sendXbee(dataXbee, MAC);
}

var updateNodeInfo = function(message, MAC){
  models.Node.getNodeByMAC(MAC, function(node){
    node.tem = message[1].toString();
    node.hum = message[2].toString();
    node.lux = (message[3]*16*16+message[4]).toString();
    if(message[5]==0x01){
      node.human = new Date();
    }
    // else {
    //   console.log('ko co nguoi');
    //   console.log(new Date() - node.human);
    // }
    node.save().then(function(){
      returnData(g_mac+'/'+MAC);
    });
    node.getDevices({
      where: {
        mode: 'auto'
      }
    }).then(function(devs){
      var lux = parseInt(node.lux);
      var tem = parseInt(node.tem);
      var now = new Date();
      for(i=0;i<devs.length;i++){
        var dataXbee = [0x02];
        if(message[5]==0x00&&(node.human==null || (new Date()-node.human)>60000)){
          if(devs[i].status=='on'){
            dataXbee.push(parseInt(devs[i].port));
            dataXbee.push(0x00); //or 0xff
            sendXbee(dataXbee,MAC);
            if(devs[i].type=='condition'){
              var dataXbee2 = [0x07];
              dataXbee2.push(0x01); //DAIKIN
              dataXbee2.push(0x00);
              sendXbee(dataXbee2,MAC);
            }
          }
        }
        else timeCheck(now,devs[i].time, function(isTrue){
          console.log('check auto');
          if(isTrue){
            var range = devs[i].range.split('/');
            range[0] = parseInt(range[0]);
            range[1] = parseInt(range[1]);
            if(devs[i].type=='fan'){ //quat
              if(tem<range[0]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0x00); //or 0xff
                if(devs[i].status=='on') sendXbee(dataXbee,MAC);
              }
              else if(tem>range[1]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0xff); //or 0xff
                if(devs[i].status=='off') sendXbee(dataXbee,MAC);
              }
            }
            else if(devs[i].type=='light'){ //den
              if(lux<range[0]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0xff); //or 0xff
                if(devs[i].status=='off') sendXbee(dataXbee,MAC);
              }
              else if(lux>range[1]){ //check dieu kien
                dataXbee.push(parseInt(devs[i].port));
                dataXbee.push(0x00); //or 0xff
                if(devs[i].status=='on') sendXbee(dataXbee,MAC);
              }
            }
            else if(devs[i].type=='condition'){ //maylanh
              if(tem>range[0]&&devs[i].status=='off'){
              console.log('thoa dieu kien auto');
                 var dataXbee2 = [0x07];
                 dataXbee2.push(0x01); //DAIKIN
                 dataXbee2.push(0xff); //ON
                 dataXbee2.push(0xff); //swing
                 dataXbee2.push(0x00); //fan
                 dataXbee2.push(0x05); //speed
                 dataXbee2.push(range[1]); //temperature
                 sendXbee(dataXbee2,MAC);
                 devs[i].temp = range[1].toString();
                 devs[i].status = 'on';
                 devs[i].save();

              }
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
      if(dev[0]){ //dev[0]!=null
        dev = dev[0];
        if(message[0]==0x03){
          console.log(message[2].toString());
          dev.button = message[2].toString();
        }
        if(message[0]==0x02||message[0]==0x06){
          dev.status = (message[2]==0x00)?'off':'on';
        }
        dev.save().then(function(){
          returnData(g_mac+'/'+MAC);
        });
      }
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
  console.log('addDevice');
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
  models.Node.getNodeByMAC(MAC, function(node){
    node.getDevices({
      where:{
        port: message.data.port
      }
    }).then(function(dev){
      if(dev[0].type == 'condition'){
        console.log('dieu khien may lanh');
        console.log(message.data.status);
        var dataXbee2 = [0x07];
        dataXbee2.push(0x01); //DAIKIN
        if(message.data.status=='off'){
          dataXbee2.push(0x00);
        }
        else {
          dataXbee2.push(0xff);
          dataXbee2.push(0xff); //swing
        dataXbee2.push(0x00); //fan
        dataXbee2.push(0x05); //speed
        dataXbee2.push(0x18); //temperature

        }

        //console.log(dataXbee2);
        sendXbee(dataXbee2,MAC);
      }
      // else{
      //   var dataXbee = [0x02];
      //   dataXbee.push(parseInt(message.data.port));
      //   dataXbee.push((message.data.status=='off')?0x00:0xff);
      //   sendXbee(dataXbee,MAC);
      // }
    });
  });
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
  var dataXbee = [0x07];
  //dataXbee.push(parseInt(message.data.port));
  dataXbee.push(0x01); //DAIKIN
  dataXbee.push(0xff); //ON
  dataXbee.push(0xff); //swing
  dataXbee.push(0x00); //fan
  dataXbee.push(0x05); //speed
  dataXbee.push(parseInt(message.data.temp)); //temperature
  sendXbee(dataXbee,MAC);

  //TODO: database
   models.Node.getNodeByMAC(MAC, function(node){
     node.getDevices({
       where:{
         port: message.data.port
       }
     }).then(function(dev){
       dev[0].temp = message.data.temp;
       dev[0].status = 'on';
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
