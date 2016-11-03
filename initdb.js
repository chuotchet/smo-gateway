var models = require('./models');
models.sequelize.sync();
var data = {
  N_MAC: 'hihi'
}
models.Node.create(data);
