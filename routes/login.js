var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
    if (req.session.authentified) {
        res.redirect('/');
        return;
    }

    var params = {
        title: 'Login'
    };

    if (req.session.login_form && req.session.login_form.errors) {
        params.errors = req.session.login_form.errors;
        delete req.session.login_form;
    }

    res.render('login', params);
});

router.post('/', function (req, res, next) {
    req.session.login_form = {};

    // Login form validation
    req.check('email', "Email required").exists().notEmpty().trim();
    req.check('email', "Email format incorrect").isEmail().trim();
    req.check('password', "Password required").exists().notEmpty().trim();

    var errors = req.validationErrors();
    if (errors) {
        req.session.login_form.errors = errors;
        res.redirect('/login');
    } else {
        // Checking the user exists
        //db.get('SELECT * FROM users WHERE email=? AND password=?', [req.body.email, req.body.password.hashCode()], function (err, rows) {
        db.query('SELECT * FROM users WHERE email=$1 AND password=$2', [req.body.email, req.body.password.hashCode()], function (err, resp) {
            if (err) throw err;

            if (resp.rows && resp.rows[0] !== undefined) {
                var user = resp.rows[0];

                req.session.user = user;
                req.session.authentified = true;
                res.cookie('user_token', user.login_token, {expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)}); // 1year

                res.redirect('/');
            } else {
                req.session.login_form.errors = [{msg: "Email or password incorrect"}];
                res.redirect('/login');
            }
        })
    }


});

module.exports = router;
