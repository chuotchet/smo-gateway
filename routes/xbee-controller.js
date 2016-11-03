var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api');

var C = xbee_api.constants;
var mqtt = require('mqtt-controller.js')
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
    console.log(">>", frame);
});

module.exports = {
  SerialPort: SerialPort,
  xbeeAPI: xbeeAPI
}
