define('PhotoUploadView', [
	'jquery',
	'underscore',
	'backbone',
	'dropzone'
], function ($, _, Backbone, Dropzone) {
	var PhotoUploadView = Backbone.View.extend({
		el: $('#article-photo-upload'),

		initialize: function () {
			// Backbone.View.prototype.initialize.apply(this, arguments);
			// console.log('initialize dropzone');
			Dropzone.autoDiscover = false; // really important : Disable auto discover for all elements:
			// This is useful when you want to create the
			// Dropzone programmatically later

			// this.listenTo(this.model,'change:pictures', this.reload_photoset(this.model));
		
			$("#article-photo-dropzone").dropzone({
				url: "/photo/upload",
				paramName: "itemphoto",
				dictDefaultMessage: "點擊這裡選擇要上傳的照片，或拖曳照片至此來上傳圖片",

				init: function() {
					this.on("success", function(file, message) { 
					    console.log(message);
					    $('#photo-upload').hide();

					    var target_html = '<p>Search image : </p><img class="well well-small" id="source-image" src="'+message.url+'"></img>';
					    $('#target-image').html(target_html);
					    $('#start-search').show();
					});
				}
			});
		},

		events: {
			'change textarea[name="photo-description"]': 'change_description',
			'keyup textarea[name="photo-description"]': 'change_description',
		},

		reload_photoset: function(){
			console.log('reload photoset');
			var pictures = this.get('pictures');  // this == model
			$('.photo-set').html('').hide();

			_.each(pictures, function(pic){
				var pic_html = '<div class="row"><span class="label">'+pic.id+'</span><div class="span3"><img src="'+ pic.url +'"></div>' +
					 '<div class="span5"><textarea rows="4" id="'+pic.id+'" name="photo-description" class="input-block-level" type="text" placeholder="關於這個照片...">'+pic.description+'</textarea></div></div>';
				$('.photo-set').append(pic_html);
				$('.photo-set').append('<hr class="soften">');
			});

			$('.photo-set').slideDown('slow');
		},

		change_description: function(event){
			var id = $(event.currentTarget).attr('id');
			var description = $(event.currentTarget).val();
			this.model.change_description(id, description);
		}


	});

	return PhotoUploadView;
});