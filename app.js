
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , routes = require('./config/routes')
  , child_process = require('child_process')
  , ejsengine = require('ejs-locals')
  , stylus = require('stylus')
  , nib = require('nib')
  , passport = require('passport')
  , facebookStrategy = require('passport-facebook').Strategy
  , sessionStore = new express.session.MemoryStore();

var app = express();

function compile(str, path) {
  return stylus(str).set('filename', path).use(nib());
}

// passport config
require("./config/passport")(app, passport, facebookStrategy);


//CORS middleware
var allowCrossDomain = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
}

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('ejs', ejsengine);  // use ejs-locals for all ejs templates:
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({ store: sessionStore
  ,secret: 'bropher'
  ,key: 'bropher.sid' }));
/* Initialize Passport */
app.use(passport.initialize());
app.use(passport.session());
app.use(require("./config/viewhelper"));  // view helper
/* cross domain */
app.use(allowCrossDomain);
app.use(app.router);
app.use(stylus.middleware({ src:__dirname + '/public', compile: compile }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var server = http.createServer(app)
  , io = require('socket.io').listen(server);
io.set('log level', 1); // reduce logging

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

routes(app, io, passport);



