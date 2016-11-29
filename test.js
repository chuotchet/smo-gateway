var SerialPort = require('serialport');
var xbee_api = require('xbee-api');

var C = xbee_api.constants;

//var mqtt = require('mqtt-controller.js')
var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});

var serialport = new SerialPort("COM5", {
  baudrate: 9600,
  parser: xbeeAPI.rawParser()
});

serialport.on("open", function() {
  var obj = {
    response: 'ahihi'
  }
  var frame_obj = {
    type: 0x10, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
    id: 0x00, // optional, nextFrameId() is called per default
    destination64: "0013a20040ac1b24",
    destination16: "fffe", // optional, "fffe" is default
    broadcastRadius: 0x00, // optional, 0x00 is default
    options: 0x00, // optional, 0x00 is default
    data: JSON.stringify(obj) // Can either be string or byte array.
}
  serialport.write(xbeeAPI.buildFrame(frame_obj));
});

// All frames parsed by the XBee will be emitted here
xbeeAPI.on("frame_object", function(frame) {
  console.log('frame_object');
  console.log(frame);
    if(frame.type == C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET){ //receive
      var message = String.fromCharCode(frame.data);
      console.log(frame.data.toString());
    }
});

// module.exports = {
//   SerialPort: SerialPort,
//   xbeeAPI: xbeeAPI
// }
