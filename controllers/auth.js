// GET /auth/facebook/callback
exports.facebook_callback = function (req, res) {
  res.redirect("/");
}

// GET /auth/facebook/fail
exports.facebook_fail = function (req, res) {
  res.json("auth failure");
}

// GET /login
exports.login = function(req, res){
  if(req.user){
    res.redirect('/');
  }else{
    res.render('auth/login');
  }
}

// GET /logout
exports.logout = function(req, res){
  req.logout();
  res.redirect('/');
}
