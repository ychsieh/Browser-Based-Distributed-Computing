require.config({
  baseUrl: '/javascripts/',
  paths: {
    // lib
    jquery: 'lib/jquery/jquery.min',
    underscore: 'lib/underscore-amd/underscore-min',
    backbone: 'lib/backbone-amd/backbone-min',
    text: 'lib/requirejs-text/text',
    socketio: 'lib/socket.io-client/dist/socket.io.min',
    dropzone: 'include/dropzone.min',

    // views
    PhotoUploadView: 'views/photoUploadView'
  },
  shim: {
    underscore: {
      exports: "_"
    },
    backbone: {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    },
    bootstrap: {
      deps: ['jquery']
    },
    PhotoUploadView: {
      deps: ['dropzone']
    }
  },
  urlArgs: "ver=0.0"
});

require(['app'], function (app) { // Load our app module and pass it to our definition function
  app.initialize(); // The "app" dependency is passed in as "App"
});
    