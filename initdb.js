var models = require('./models');
models.sequelize.sync();
var data = {
  N_MAC: 'hoho'
}
models.Node.create(data);
