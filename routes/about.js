var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');


router.get('/', function (req, res, next) {
    res.render('about', {title:'About'});
});

module.exports = router;
