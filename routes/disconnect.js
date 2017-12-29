var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');

router.get('/', function(req, res, next) {
    req.session.user = {};
    req.session.authentified = false;
    res.clearCookie('user_token');

    utils.setFlash(req.session, "Successfully logged out!", "success");

    res.redirect('/login');
});

module.exports = router;
