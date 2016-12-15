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

serialport.on("open", function() {
  // var frame_obj = { // AT Request to be sent to
  //   type: C.FRAME_TYPE.AT_COMMAND,
  //   command: "NI",
  //   commandParameter: [],
  // };
  //
  // serialport.write(xbeeAPI.buildFrame(frame_obj));
  console.log('open port');
});

// All frames parsed by the XBee will be emitted here
xbeeAPI.on("frame_object", function(frame) {
  console.log('sdfdfdfdf');
    console.log(">>", frame);
});
