module.exports = function(req, res, next){
	res.locals.env = process.env.NODE_ENV;
	res.locals.user = req.user;

	next();
}; 