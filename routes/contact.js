var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');


router.get('/', function (req, res, next) {
    res.render('contact');
});

router.post('/', function (req, res, next) {
    utils.setFlash(req.session, "You're not allowed to send messages. You have a read-only account.", 'warning');
    res.redirect('/contact');
});

module.exports = router;
