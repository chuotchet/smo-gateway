var models = require('./models');
models.sequelize.sync();
// var data = {
//   N_MAC: '0013a20040ac1aed'
// }
// models.Node.create(data);
models.Node.findOrCreate({where: {N_MAC:'ahuhuh'}}).spread(function(node,created){
  console.log(node);
  console.log(created);
});
