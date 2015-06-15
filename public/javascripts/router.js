define([
  'jquery',
  'underscore',
  'backbone',
  'socketio',
  'PhotoUploadView'
], function($, _, Backbone, Socketio, PhotoUploadView) {
	var AppRouter = Backbone.Router.extend({
      routes: {
        // Define some URL routes
        '': 'home',

        'mapper': 'mapper',

        // Default
        '*actions': 'defaultAction'
      },

      initialize: function(){
        console.log('router initialize');
        if (window.location.hash == '#_=_')
          window.location.hash = '';

  //     	var socket = io.connect('http://localhost:5000');
  //     	socket.on('news', function (data) {
		//     console.log(data);
		//     socket.emit('event', { my: 'data' });
		// });
      },

      home: function(){
          this.photoUploadView = new PhotoUploadView();
          var current_hostname = window.location.hostname,
        	    main_socket = io.connect('http://'+current_hostname+':3000/main');
        	main_socket.on('connect', function(){
          		console.log('main socket connect');
              // initialize page ui
              // current mapper
              // current photo page
              main_socket.emit('initialize', {});
        	});

          // ui initialize
        	main_socket.on('current_mappers', function(data){
          		console.log('current mappers: '+ data.mappers);
              // refresh mapper info table
              var table_html = '',
                  index = 0;
              if(data.mappers.length > 0){
                _.each(data.mappers, function(mapper){
                  table_html += '<tr>';
                  table_html += '<td>'+index+'</td>';
                  table_html += '<td>'+mapper.socket_id+'</td>';
                  table_html += '<td>'+mapper.current+'</td>';
                  table_html += '<td>'+mapper.finish+'</td>';
                  table_html += '<td>'+mapper.status+'</td>';
                  table_html += '</tr>';
                  index += 1;
                });
              }
              $('#mapper-tbody').html(table_html); 
        	});
          // ui initialize
          main_socket.on('current_search', function(data){
              // start searching
              console.log('search: '+data.search_img);
              if(data.search_img){
                  $('#photo-upload').hide();
                  var target_html = '<p>Search image : </p><img class="well well-small" id="source-image" src="'+data.search_img+'"></img>';
                  $('#target-image').html(target_html);
                  $('#start-search').html('Searching ...');
                  $('#start-search').addClass('disabled');
                  $('#start-search').attr('disabled', 'disabled');
                  $('#start-search').show();
              }
          });

          // ui update total photos page
          main_socket.on('update_total_pages', function(data){
              var num = parseInt(data.total_page) * 25;
              $('#total-page').html(data.total_page+',  [ '+num+' photos ]');
          });

          // ui update completed photos page
          main_socket.on('update_completed_pages', function(data){
              console.log('ui update completed photos page');
              var num = parseInt(data.completed_page) * 25;
              $('#completed-page').html(data.completed_page+',  [ '+num+' photos ]');
          });

          // ui update rank
          main_socket.on('update_rank', function(data){
            console.log('rank data');
            console.dir(data);

            // rank alert
            $('#rank-alert').show();
            setTimeout(function() {
                $('#rank-alert').fadeOut('slow');
            }, 4000);


            $('#photo-rank').fadeOut('slow');
            var rank_html = '';
            for(var i=0; i<data.length; i++){
              rank_html = rank_html + '<div class="rank-element">';
              rank_html = rank_html + '<h4>#'+(i+1)+', score: '+data[i].score+'</h4>';
              rank_html = rank_html + '<h5>'+data[i].text+'</h5>';
              rank_html = rank_html + '<p><a href="'+data[i].link+'">'+data[i].link+'</a></p>';
              rank_html = rank_html + '<img class="well well-small" id="result-image" src="'+data[i].source+'"></img>';
              rank_html = rank_html + '</div>';
            }

            $('#rank-list').html(rank_html);
            $('#photo-rank').fadeIn('slow');

          });

          $('#start-search').click(function(){
              var img_src = $('#source-image').attr('src');
              console.log('img src : '+img_src);

              $('#start-search').html('Searching ...');
              $('#start-search').addClass('disabled');
              $('#start-search').attr('disabled', 'disabled');

              setTimeout(function() {
                $('#stop-search').show();
              }, 8000);
              
              main_socket.emit('start_search', {search_img: img_src});
          });

          $('#stop-search').click(function(e){
              console.log('stop search');
              $('#restart-search').show();
              $('#start-search').html('Search Completed');

              main_socket.emit('stop_search', {});
          });

          $('#restart-search').click(function(e){
              main_socket.emit('restart', {});
              $('#restart-search').addClass('disabled');
              $('#restart-search').attr('disabled', 'disabled');
              $('#restart-search').html('Restart...');

              $('#stop-search').addClass('disabled');
              $('#stop-search').attr('disabled', 'disabled');
              setTimeout(function() {
                window.location.reload();
              }, 2000);
          });

          
      },




      mapper: function(){
      	
      },

      defaultAction: function(){
        // Backbone.history.navigate('', true);
      }
    });

    var initialize = function(){
    	var app_router = new AppRouter();
    	Backbone.history.start({pushState: true, root: '/'});
  	};

  	return {
      initialize: initialize
    };
});