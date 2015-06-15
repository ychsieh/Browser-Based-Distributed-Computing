var util = require('util'),
    twitter = require('twitter'),
    _ = require('underscore'),
    async = require('async');

console.log('start a worker to crawl twitter search');

var twit = new twitter({
    consumer_key: 'kR28dZPOejz38WiSYxEDYg',
    consumer_secret: 'QbJIDhOWFN7BVQOEC1zANYCB7FDkhMGUGDoH9iv1w',
    access_token_key: '608427831-6JiXrQ4tGPQhwftn9cfEjnFnIUOhEFbEhgIfbM',
    access_token_secret: 'Fblq4aEMab5RlZvz8ZqfnSF8UJ1hULqF9UkLkuNwY'
});

var tweet_per_page = 100;

function twitter_search(keyword, page, max_id, tweets){
	console.log('hello'+page);

	twit.search(keyword, {rpp: tweet_per_page, page: page, max_id: max_id},  function(result) {
		_.each(result["results"], function(tweet){
  			var t = {
  				id: tweet["id"],
  				created_at: tweet["created_at"],
  				from_user: tweet["from_user"],
  				from_user_id: tweet["from_user_id"],
  				iso_language_code: tweet["iso_language_code"],
  				text: tweet["text"]
  			};

  			tweets.push(t);
  		});

	  	process.send({msg: 'progress', tweet_count: tweets.length, keyword: keyword, max_id: max_id});


		if(result["next_page"]){
			next_page = result["next_page"].split('&')[0].split('=')[1];
			console.log(util.inspect(result.completed_in));
			twitter_search(keyword, next_page, max_id ,tweets);
		}
		else{
			console.log('end page');
			console.log('worker exit');

			process.send({msg: 'exit', tweet_count: tweets.length, keyword: keyword, max_id: max_id});
			process.exit();
		}
	});
}


process.on('message', function(m) {
	if(m.keyword){
		var keyword = m.keyword,
			task_request = [],
			tweets = [];
		console.log('CHILD got keyword:', keyword);

		// first time search
	  	twit.search(keyword, {rpp: tweet_per_page},  function(data) {
	  		var max_id = data["max_id"];

	  		_.each(data["results"], function(tweet){
	  			var t = {
	  				id: tweet["id"],
	  				created_at: tweet["created_at"],
	  				from_user: tweet["from_user"],
	  				from_user_id: tweet["from_user_id"],
	  				iso_language_code: tweet["iso_language_code"],
	  				text: tweet["text"]
	  			};

	  			tweets.push(t);
	  		});

	  		process.send({msg: 'progress', tweet_count: tweets.length, keyword: keyword, max_id: max_id});
	  		// var page = data.next_page.toString();
	  		// console.log(data);
	  		// console.log('next : '+data.next_page);

	  		if(data["next_page"]){
				var next_page = data["next_page"].split('&')[0].split('=')[1];
				twitter_search(keyword, next_page, max_id ,tweets);
			}
			else{
				console.log('end page');
				console.log('worker exit');

				process.send({msg: 'exit', tweet_count: tweets.length, keyword: keyword, max_id: max_id});
				process.exit();
			}
		});
	}
});



