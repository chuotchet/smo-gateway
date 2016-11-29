var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api');

var C = xbee_api.constants;

var frameSend = {
    type: 0x10, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
    id: 0x01, // optional, nextFrameId() is called per default
    destination64: "0013a200400a0127",
    destination16: "fffe", // optional, "fffe" is default
    broadcastRadius: 0x00, // optional, 0x00 is default
    options: 0x00, // optional, 0x00 is default
    data: "" // Can either be string or byte array.
}

//var mqtt = require('mqtt-controller.js')
var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});

var serialport = new SerialPort("COM19", {
  baudrate: 57600,
  parser: xbeeAPI.rawParser()
});

serialport.on("open", function() {
  var frame_obj = { // AT Request to be sent to
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "NI",
    commandParameter: [],
  };

  serialport.write(xbeeAPI.buildFrame(frame_obj));
});

// All frames parsed by the XBee will be emitted here
xbeeAPI.on("frame_object", function(frame) {
    if(frame.id=='' && frame.type ==''){ //receive
      var message = String.fromCharCode(frame.commandData);
      var MAC = String.fromCharCode(frame.destination64);
    }
});

module.exports = {
  SerialPort: SerialPort,
  xbeeAPI: xbeeAPI
}
