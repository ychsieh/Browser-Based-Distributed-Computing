var util = require('util'),
    _ = require('underscore'),
    async = require('async'),
    fbgraph = require('fbgraph'),
    redis = require('redis'),
	redisClient = redis.createClient();


function facebookPhotosNextPage(id, param){

	var url = id+'/photos?limit='+param.limit+'&access_token='+param.access_token+'&until='+param.until;
	console.log('url: '+url);

	fbgraph.get(url, function(err, res){
		if(res.data.length == 0){
			console.log('End collect user facebook photo.');
		}
		else{
	    	redisClient.scard("PhotoPageSet", function(err, reply){
	    		var current_page = reply + 1;
	    		console.log('current page : '+current_page);

	    		_.each(res.data, function(data){
	    			var postMsg = '';
	    			if(data.name){
	    				postMsg = data.name;
	    			}
	    			
	    			var insertData = {
	    				id: data.id,
	    				from: data.from,
	    				source: data.source,
	    				link: data.link,
	    				text: postMsg
	    			};
	    			redisClient.rpush('PhotoPageData:'+current_page, JSON.stringify(insertData));
	    		});

	    		var photoPageInfo = {
	    			page: current_page,
	    			status: 0,
	    			count: res.data.length
	    		};

	    		redisClient.hmset("PhotoPage:"+current_page, photoPageInfo);
				redisClient.sadd("PhotoPageSet", "PhotoPage:"+current_page);

				// signal to parent process
				process.send({ msg: 'new page', update_photos: photoPageInfo });

				var parameters = {
					fields: 'photos',
					access_token: res.paging.next.split('&')[1].split('=')[1],
					limit: res.paging.next.split('&')[0].split('=')[1],
					until: res.paging.next.split('&')[2].split('=')[1]
				};
				facebookPhotosNextPage(id, parameters);
	    	});
		}
	});
}


console.log('start search user facebook photo.');

redisClient.hgetall("User", function (err, user) {
    fbgraph.setAccessToken(user.accessToken);

    var params = { fields: "photos" };

    fbgraph.get(user.facebook_id, params, function(err, res){
    	console.dir(res);

    	redisClient.scard("PhotoPageSet", function(err, reply){
    		var current_page = reply + 1;
    		console.log('current page : '+current_page);

    		_.each(res.photos.data, function(data){
    			var postMsg = '';
    			if(data.name){
    				postMsg = data.name;
    			}
    			var insertData = {
    				id: data.id,
    				from: data.from,
    				source: data.source,
    				link: data.link,
    				text: postMsg
    			};
    			redisClient.rpush('PhotoPageData:'+current_page, JSON.stringify(insertData));
    		});


    		var photoPageInfo = {
    			page: current_page,
    			status: 0, // initialize
    			count: res.photos.data.length
    		};

    		redisClient.hmset("PhotoPage:"+current_page, photoPageInfo);
			redisClient.sadd("PhotoPageSet", "PhotoPage:"+current_page);


			// signal to parent process
			process.send({ msg: 'new page', update_photos: photoPageInfo });


			// next page
			var parameters = {
				fields: 'photos',
				access_token: res.photos.paging.next.split('&')[0].split('=')[1],
				limit: res.photos.paging.next.split('&')[1].split('=')[1],
				until: res.photos.paging.next.split('&')[2].split('=')[1],
			};
			facebookPhotosNextPage(user.facebook_id, parameters);
    	});

    	
    });
});



