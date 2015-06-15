/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('main/index');
};


exports.mapper = function(req, res){
  res.render('main/mapper');
};

var fs = require('fs'),
    path = require("path"),
    mkdirp = require('mkdirp');

exports.photo_upload = function(req, res){
	console.log(req.files);
    var appRootPath = path.normalize(__dirname+'/..');
        uploadRootPath = appRootPath+'/public/uploads/photo',
        i = 0,
        uploadfile = req.files.itemphoto;
    /* check dir exists */
    if (!fs.existsSync(uploadRootPath+'/'))
        mkdirp.sync(uploadRootPath);

    // console.log('app root path :'+appRootPath);


    var tmp_path = req.files.itemphoto.path,
        item_name = uploadfile.name,
        new_path = uploadRootPath+'/'+item_name;

    // console.log('tmp path :'+tmp_path);
    // console.log('new path :'+new_path);

    fs.rename(tmp_path, new_path, function(error){
        if(error){
            console.log(error)
            res.send({
                error: 'File uploaded cancelled, error.'
            });
            return;
        }

        res.send({
            url: 'http://'+req.get('host')+'/uploads/photo/'+item_name
        });
    });
}


// for test data
var _ = require('underscore'),
	redis = require('redis'),
	redisClient = redis.createClient();
exports.getData = function(req, res){
	var page = req.params.page,
		returnPhotoData = [];

	console.log('page: '+page);
	redisClient.lrange("PhotoPageData:"+page, 0, -1, function(err, photos){
		var totalCount = photos.length;
		if(photos.length <= 0){
			res.json({
				photos: [], 
				search_img: '',
				page: page
			});

		}
		else{
			_.each(photos, function(photo){
				returnPhotoData.push(JSON.parse(photo));
				if(totalCount == returnPhotoData.length){
					redisClient.get("search_img", function(err, reply){
						console.log('search img: '+reply);
						if(reply){
							res.json({
								photos: returnPhotoData, 
								search_img: reply,
								page: page
							});
						}
					});
				}
			});
		}
	});

}