/*
	GET /search/:keyword
*/
var child_process = require('child_process');


exports.search = function(req, res) {
	var keyword = req.params.keyword;
	if(keyword){
		var worker = child_process.fork('./workers/twitter_search');
		worker.send({keyword: keyword});
	}
}