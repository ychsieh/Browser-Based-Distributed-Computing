module.exports = function(app, io, passport) {
	// include
	var _ = require('underscore'),
		util = require('util'),
		config = require('./config.json'),
		child_process = require('child_process'),
		redis = require('redis'),
		redisClient = redis.createClient();

	// routes
	var main = require('../controllers/main'),
		auth = require('../controllers/auth');

	// sockets
	var main_socket = io.of('/main'),
		mapper_socket = io.of('/mapper');

	redisClient.flushdb( function (err, didSucceed) {
        console.log("Restart Redis: " + didSucceed); // true
    });

	// get os ip
    var os = require('os')
	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (k in interfaces) {
	    for (k2 in interfaces[k]) {
	        var address = interfaces[k][k2];
	        if (address.family == 'IPv4' && !address.internal) {
	            addresses.push(address.address)
	        }
	    }
	}
	var ipAddress = addresses.toString();
	console.log('IP address:'+ipAddress);


	// main console socket
	main_socket.on('connection', function(socket) {

		// main console initialize
		socket.on('initialize', function(data){
			// get current mapper
			redisClient.smembers("Mappers", function(err, mappers){
				var mappers_data = [],
					mappers_length = mappers.length;

				_.each(mappers, function(mapper){
					redisClient.hgetall(mapper, function(err, obj){
						mappers_data.push(obj);

						if(mappers_data.length == mappers_length){
							main_socket.emit('current_mappers', {mappers: mappers_data});
						}
					});
				});
			});

			// get current search img
			redisClient.get("search_img", function(err, reply){
				if(reply){
					main_socket.emit('current_search', {search_img: reply});
				}
			});

		});


		// start search
		socket.on('start_search', function(data){
			var search_img = data.search_img.replace("localhost", ipAddress);

			redisClient.set('search_img', search_img);

			// fork child process
			var search_process = child_process.fork('./workers/facebook_photo_search.js');
			// new photo page store
			search_process.on('message', function(m){
				if(m.msg == 'new page'){
					redisClient.scard("PhotoPageSet", function(err, reply){
						main_socket.emit('update_total_pages', {total_page: reply});
					});
				}
			});

		});

		// stop search
		socket.on('stop_search', function(data){
			mapper_socket.emit('close_tab', {});
		});

		// restart search
		socket.on('restart', function(data){
			// redisClient.flushdb( function (err, didSucceed) {
		 //        console.log("Restart Redis: " + didSucceed); // true
		 //    });
			redisClient.del("search_img");
			redisClient.smembers("PhotoPageSet", function(err, photoPageSet){
				_.each(photoPageSet, function(photoPage){
					redisClient.del(photoPage);
					redisClient.hgetall(photoPage, function(err, obj){
						redisClient.del("PhotoPageData:"+obj.page);
					});
				});
				redisClient.del("PhotoPageSet");
			});	
		});
		

		// disconnect
		socket.on('disconnect', function(){	
			console.log('client disconnect');
		});
		
	});


	// mapper socket
	mapper_socket.on('connection', function(socket){

		// mapper enter
		socket.on('userinfo', function(data){

			var finishArray = [];
			var client_info = {
				socket_id: socket.id,
				user_agent: data.user_agent,
				status: 'idle',
				finish: finishArray.toString(),
				current: ''
			};
			redisClient.hmset("Mapper:"+socket.id, client_info);
			redisClient.sadd("Mappers", "Mapper:"+socket.id);

			// get current mapper and emit to main socket
			redisClient.smembers("Mappers", function(err, mappers){
				var mappers_data = [],
					mappers_length = mappers.length;

				_.each(mappers, function(mapper){
					redisClient.hgetall(mapper, function(err, obj){
						mappers_data.push(obj);

						if(mappers_data.length == mappers_length){
							main_socket.emit('current_mappers', {mappers: mappers_data});
						}
					});
				});
			});

			// get waiting photos page and send job to mapper
			redisClient.smembers("PhotoPageSet", function(err, photoPageSet){
				var waitingPagesArray = [],
					index = 1;
				_.each(photoPageSet, function(photoPage){
					redisClient.hgetall(photoPage, function(err, obj){
						if(obj.status == '0'){
							waitingPagesArray.push(obj);
						}
						if(index == photoPageSet.length){
							// console.log('FIND WAIT PAGE END :'+waitingPagesArray[0].page);
							if(waitingPagesArray.length > 0){

								// change photoPage status
								var photoPageInfo = waitingPagesArray[0];
								photoPageInfo.status = 1;
								redisClient.hmset("PhotoPage:"+photoPageInfo.page, photoPageInfo);


								// dispatch job
								redisClient.lrange("PhotoPageData:"+waitingPagesArray[0].page, 0, -1, function(err, photos){
									var photosData = [];
									_.each(photos, function(p){
										photosData.push(JSON.parse(p));
									});
									// console.log('page: '+obj.page+', length: '+photos.length);
									redisClient.get("search_img", function(err, reply){
										// console.log('search img: '+reply);
										if(reply){
											mapper_socket.socket(socket.id).emit('send_job', {
												photos: photosData, 
												search_img: reply,
												page: photoPageInfo.page,
												count: photoPageInfo.count
											});
											
											console.log('DEBUG: mapper enter get page: '+photoPageInfo.page);

											// change mapper current status
											redisClient.hgetall("Mapper:"+socket.id, function(err, mapperInfo){
												mapperInfo.current = photoPageInfo.page;
												mapperInfo.status = 'busy';
												redisClient.hmset("Mapper:"+socket.id, mapperInfo);

												// get current mapper and emit to main socket
												redisClient.smembers("Mappers", function(err, mappers){
													var mappers_data = [],
														mappers_length = mappers.length;

													_.each(mappers, function(mapper){
														redisClient.hgetall(mapper, function(err, obj){
															mappers_data.push(obj);

															if(mappers_data.length == mappers_length){
																main_socket.emit('current_mappers', {mappers: mappers_data});
															}
														});
													});
												});
											});
										}
									});
								});
							}
							// no waiting job
							else{

							}
						}
						index = index + 1;
					});
					
				});

			// 	if(!haveWaitPage){
			// 		console.log('mapper no job');
			// 	}
			});
		});

		socket.on('disconnect', function(){
			// change mapper processing page status
			redisClient.hgetall("Mapper:"+socket.id, function(err, map){
				if(map.current){
					console.log('disconnect mapper current: '+map.current);
					redisClient.hgetall("PhotoPage:"+map.current, function(err, photopage){
						var pageInfo = photopage;
						pageInfo.status = 0;
						redisClient.hmset("PhotoPage:"+map.current, pageInfo);
					});
				}
			});

			// mapper disconnect
			redisClient.del("Mapper:"+socket.id);
			redisClient.srem("Mappers", "Mapper:"+socket.id);

			// get current mapper
			redisClient.smembers("Mappers", function(err, mappers){
				var mappers_data = [],
					mappers_length = mappers.length;
				// console.log('mapper lenght: '+mappers_length);

				if(mappers_length > 0){
					_.each(mappers, function(mapper){
						redisClient.hgetall(mapper, function(err, obj){
							mappers_data.push(obj);

							if(mappers_data.length == mappers_length){
								main_socket.emit('current_mappers', {mappers: mappers_data});
							}
						});
					});
				}
				else{
					main_socket.emit('current_mappers', {mappers: mappers_data});
				}
			});

			// main_socket.emit('current_mappers', {mappers: mapper_socket_clients});
		});
		

		// mapper busy reject page
		socket.on('mapper_busy', function(data){
			redisClient.hgetall("PhotoPage:"+data.page, function(err, obj){
				obj.status = 0;
				redisClient.hmset("PhotoPage:"+data.page, obj);
			});
		});

		// mapper return value
		socket.on('return_result', function(data){
			var i = 0;
			console.log('return result: '+data.page+', length: '+data.photos.length);
			// get result insert to sort set
			_.each(data.photos, function(p){
				// console.log('id: '+i+' , score: '+p.score);
				var resultData = JSON.stringify(p);
				redisClient.hmset("PhotoResult:"+p.id, {
					id: p.id,
					from: JSON.stringify(p.from),
					source: p.source,
					score: p.score,
					link: p.link,
					text: p.text
				});
				redisClient.zadd(["PhotoResultSet", p.score, "PhotoResult:"+p.id], function(err, resultRes){
					console.log('result insert: '+resultRes);
					if(i == data.photos.length-1){
						console.log('i:'+i+', emit top ten');
						redisClient.zrevrange(["PhotoResultSet", 0, 9], function(err, topResults){
							// return top ten result id
							// console.dir(topResults);
							var topTenResultArray = [];
							_.each(topResults, function(resultId){
								redisClient.hgetall(resultId, function(err, resultData){
									topTenResultArray.push(resultData);
									if(topTenResultArray.length == topResults.length){
										// emit update rank
										main_socket.emit('update_rank', topTenResultArray);
									}
								});
							});
						});
					}

					i++;
				});
			});

			// update finish array
			redisClient.hgetall("Mapper:"+socket.id, function(err, mapperInfo){
				var finishArray = mapperInfo.finish.split(',');
				// console.dir(finishArray);
				if(finishArray[0] == ''){
					finishArray.splice(0, 1);
				}
				finishArray.push(data.page);
				// console.dir(finishArray);
				mapperInfo.finish = finishArray.toString();

				redisClient.hmset("Mapper:"+socket.id, mapperInfo);
			});


			
			// change page status to 2
			redisClient.hgetall("PhotoPage:"+data.page, function(err, photopage){
				photopage.status = 2;
				redisClient.hmset("PhotoPage:"+data.page, photopage);

				// update completed page ui
				var haveWaitPage = false;
				redisClient.smembers("PhotoPageSet", function(err, photoPageSids){
					var completedPages = [],
						waitingPagesArray = [],
						i = 1;

					_.each(photoPageSids, function(pid){
						redisClient.hgetall(pid, function(err, obj){
							// find completed page (status == 2)
							if(obj.status == '2'){
								completedPages.push(obj);
							}

							// find waiting page (status == 0)
							if(obj.status == '0'){
								waitingPagesArray.push(obj);
							}

							// update completed pages
							if(i == photoPageSids.length){
								main_socket.emit('update_completed_pages', {completed_page: completedPages.length});

								// have waiting page to dispatch
								if(waitingPagesArray.length > 0){
									console.log('waiting page: '+waitingPagesArray[0].page);

									// update page to status 1
									var photoPageInfo = waitingPagesArray[0];
									photoPageInfo.status = 1;
									redisClient.hmset("PhotoPage:"+photoPageInfo.page, photoPageInfo);

									redisClient.lrange("PhotoPageData:"+waitingPagesArray[0].page, 0, -1, function(err, photos){
										// console.log('page: '+obj.page+', length: '+photos.length);
										// console.dir(photos);
										var photosData = [];
										_.each(photos, function(p){
											photosData.push(JSON.parse(p));
										});

										// emit
										redisClient.get("search_img", function(err, reply){
											console.log('dispatch page: '+waitingPagesArray[0].page+' to socket: '+socket.id);
											if(reply){
												// update mapper status
												redisClient.hgetall("Mapper:"+socket.id, function(err, mapperInfo){
													var finishArray = mapperInfo.finish.split(',');

													mapper_socket.socket(socket.id).emit('send_job', {
														photos: photosData, 
														search_img: reply,
														page: waitingPagesArray[0].page,
														count: waitingPagesArray[0].count
													});
	
													mapperInfo.current = waitingPagesArray[0].page;
													mapperInfo.status = 'busy';
													// set mapper info
													redisClient.hmset("Mapper:"+socket.id, mapperInfo);

													// get current mapper
													// update main console mapper
													redisClient.smembers("Mappers", function(err, mappers){
														var mappers_data = [],
															mappers_length = mappers.length;

														if(mappers_length > 0){
															_.each(mappers, function(mapper){
																redisClient.hgetall(mapper, function(err, obj){
																	mappers_data.push(obj);

																	if(mappers_data.length == mappers_length){
																		main_socket.emit('current_mappers', {mappers: mappers_data});
																	}
																});
															});
														}
														else{
															main_socket.emit('current_mappers', {mappers: mappers_data});
														}
													});
													
												});
											}
										});
									});
								}
								// no waiting page to dispatch
								else{
									// update mapper status
									redisClient.hgetall("Mapper:"+socket.id, function(err, mapperInfo){
										mapperInfo.current = '';
										mapperInfo.status = 'idle';
										// set mapper info
										redisClient.hmset("Mapper:"+socket.id, mapperInfo);

										// get current mapper
										// update main console mapper
										redisClient.smembers("Mappers", function(err, mappers){
											var mappers_data = [],
												mappers_length = mappers.length;

											if(mappers_length > 0){
												_.each(mappers, function(mapper){
													redisClient.hgetall(mapper, function(err, obj){
														mappers_data.push(obj);

														if(mappers_data.length == mappers_length){
															main_socket.emit('current_mappers', {mappers: mappers_data});
														}
													});
												});
											}
											else{
												main_socket.emit('current_mappers', {mappers: mappers_data});
											}
										});
									});

								}
							}

							i = i + 1; 
						});
					});
				});

			});
		});

	});



	// io.sockets.on('connection', function (socket) {
	//   socket.emit('news', { hello: 'world' });
	//   socket.on('event', function (data) {
	//     console.log(data);
	//   });
	// });

	// routes
	// app.all('/', function(req, res, next) {
	//   res.header("Access-Control-Allow-Origin", "*");
	//   next();
	// });

	app.get('/', main.index);
	app.get('/mapper', main.mapper);
	app.post('/photo/upload', main.photo_upload);
	app.get('/data/:page', main.getData);


	// auth
	app.get('/login', auth.login);
	app.get('/auth/facebook', passport.authenticate('facebook', { scope: config["development"].FACEBOOK_SCOPE } ));
	app.get('/auth/facebook/callback', 
		passport.authenticate('facebook', { failureRedirect: '/auth/fail' }), 
		auth.facebook_callback);
	app.get('/auth/facebook/fail', auth.facebook_fail);
	app.get('/logout', auth.logout);

};