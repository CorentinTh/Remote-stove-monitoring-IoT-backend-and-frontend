var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');

router.get('/', function (req, res, next) {

    if(req.session.user && req.session.authentified){
        res.render('demo', {title:'Demo', jquery_ui: true});
    }else{

        db.query('SELECT * FROM users WHERE email=$1', ['demo@heatensee.com'], function (err, resp) {
            if(err) throw err;

            req.session.user = resp.rows[0];
            req.session.authentified = true;

            res.redirect('/demo');
        });
    }

});

module.exports = router;
