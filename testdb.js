var models = require('./models');
// var port = {
//   port1: 'on',
//   port2: 'off',
//   port3: 'off',
//   port4: 'off',
//   port5: 'on',
//   port6: 'on',
//   port7: 'on',
//   port8: 'on'
// }
models.Node.getNodeByMAC('ahuhuh', function(node){
  console.log(node);
  //node.destroy();
  // node.getDevices().then(function(devs){
  //   for(i=0;i<devs.length;i++){
  //     console.log('port'+devs[i].port+'  '+devs[i].status);
  //     // devs[i].status = port['port'+devs[i].port];
  //     // devs[i].save();
  //   }
  // });
});



// models.Node.getNodeByMAC('hoho', function(node){
//   var data = {
//     type: 'quat',
//     name: 'quat may',
//     button: '4',
//     port: '2'
//   }
//   models.Device.create(data).then(function(dev){
//     node.addDevice(dev).then(function(){
//       //TODO: xbee send or sth?
//       //returnData(topic);
//     });
//   });
// });
