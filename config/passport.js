module.exports = function (app, passport, facebookStrategy) {
	// var mongo = require('mongoskin'),
	// 	malloDB = mongo.db('mongodb://andikan:0510@ds033037.mongolab.com:33037/mallo?auto_reconnect', {safe:true}),
	var _ = require('underscore'),
		config = require('./config.json'),
		redis = require('redis'),
		redisClient = redis.createClient(),

		// Users = global.OnlineUser,
		facebook_app_id,
		facebook_app_secret,
		facebook_callback_url;


	passport.serializeUser(function(user, done) {
	  done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
	  done(null, obj);
	});

	if ('development' == app.get('env')) {
		facebook_app_id = config["development"].FACEBOOK_APP_ID;
		facebook_app_secret = config["development"].FACEBOOK_APP_SECRET;
		facebook_callback_url = "http://localhost:"+config["development"].port+"/auth/facebook/callback";
	}
	else {
		facebook_app_id = config["production"].FACEBOOK_APP_ID;
		facebook_app_secret = config["production"].FACEBOOK_APP_SECRET;
		facebook_callback_url = "http://minna.herokuapp.com/auth/facebook/callback";
	}


	passport.use(new facebookStrategy({
	    clientID: facebook_app_id,
	    clientSecret: facebook_app_secret,
	    callbackURL: facebook_callback_url
	  },
	  function(accessToken, refreshToken, profile, done) {
	    // asynchronous verification, for effect...
	    console.log('accessToken:'+ accessToken);
	    console.log('profile:'+ JSON.stringify(profile));

	    redisClient.hmset("User", {
	    	accessToken: accessToken,
	    	facebook_id: profile.id,
			username: profile.username,
			displayName: profile.displayName,
			name: JSON.stringify(profile.name),
			gender: profile.gender,
			locale: profile._json.locale,
			timezone: profile._json.timezone,
			profileUrl: profile.profileUrl
	    })

	    redisClient.hgetall("User", function (err, obj) {
	    	return done(null, obj);
	    	redisClient.quit();
		});
	  }
	));
};