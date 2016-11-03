var http = require('http');
var express = require('express');
var jsonfile = require('jsonfile');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var generator = require('generate-password');
var requestify = require('requestify');
var userfile = './config/user.json';
var tokenfile = './config/token.json';
var router = express.Router();
var checkPassword = function(password, callback){
  jsonfile.readFile(userfile, function(err, user){
    callback(user.password==password);
  });
}
//get gateway MAC address
require('getmac').getMac(function(err,macAddress){
    if (err)  throw err;
    jsonfile.readFile(tokenfile, function(err,info){
      info.G_MAC = macAddress;
      jsonfile.writeFile(tokenfile, info, function(err){
      });
    });
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
    console.log('redirect');
		res.redirect('/login');
	}
}

passport.use(new LocalStrategy(
  function(username, password, done){
    if(username!='admin'){
      console.log('usernamesss');
      return done(null, false);
    }
    checkPassword(password, function(isMatch){
      if(isMatch) return done(null, username);
      else return done(null, false);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
/* GET home page. */
router.get('/', ensureAuthenticated, function(req, res) {
  res.render('index');
});

router.get('/login', function(res, res){
  res.render('login')
});

router.post('/login',
  passport.authenticate('local')
  ,function(req, res){
  res.redirect('/');
});

router.get('/changepass', ensureAuthenticated, function(req,res){
  res.render('changepassword');
});

router.post('/changepass', ensureAuthenticated, function(req,res){
  var oldpass = req.body.oldpass;
  var newpass = req.body.newpass;
  jsonfile.readFile(userfile, function(err, user){
    if(user.password==oldpass){
      user.password = newpass;
      jsonfile.writeFile(userfile, user, function(err){
        console.error(err);
        res.send('Change password successfully!');
      });
    }
    else {
      res.send('Password is incorrect!');
    }
  });
});

router.get('/qrcode', ensureAuthenticated, function(req,res){
  jsonfile.readFile(tokenfile, function(err, info){
    if(info.key==null){
      info.key = generator.generate({number: true});
      jsonfile.writeFile(tokenfile, info, function(err){
        res.locals.token = info;
        res.render('qrcode');
      });
    }
    else {
      res.locals.token = info;
      res.render('qrcode');
    }
  });
});

router.get('/changeqr', ensureAuthenticated, function(req,res){
  jsonfile.readFile(tokenfile, function(err, info){
    info.key = generator.generate({number: true});
    jsonfile.writeFile(tokenfile, info, function(err){
      requestify.post('https://cc-smo.herokuapp.com/gateway', info).then(function(response){
        console.log(response.getBody());
      });
      // info = {
      //   N_MAC: 'hoho',
      //   key: 'hehe'
      // }
      res.locals.token = info;
      res.render('qrcode');
    });
  });
});
module.exports = router;
