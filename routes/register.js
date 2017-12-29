var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');

router.get('/', function (req, res, next) {

    if (req.session.authentified) {
        res.redirect('/');
        return;
    }

    var params = {
        title: 'Register'
    };

    if (req.session.register_form && req.session.register_form.errors) {
        params.errors = req.session.register_form.errors;
        delete req.session.register_form;
    }

    res.render('register', params);
});

router.post('/', function (req, res, next) {

    if (process.env.allow_register && process.env.allow_register == 'true') {
        req.session.register_form = {};

        // Register form validation
        req.check('email', "Email required").exists().notEmpty().trim();
        req.check('first_name', "First name required").exists().notEmpty().trim();
        req.check('last_name', "Last name required").exists().notEmpty().trim();
        req.check('password', "Password required").exists().notEmpty().trim();
        req.check('repeat_password', "Password confirmation required").exists().notEmpty().trim();

        req.check('email', "Email format incorrect").isEmail().trim();
        req.check('repeat_password', "Passwords does not match").equals(req.body.password).trim();

        var errors = req.validationErrors();
        if (errors) {
            req.session.register_form.errors = errors;
            res.redirect('/register');
        } else {

            db.query('SELECT id FROM users WHERE email=$1 OR firstname=$2 AND lastname=$3', [
                req.body.email,
                req.body.first_name,
                req.body.last_name
            ], function (err, resp) {
                if (err) throw err;

                if (resp.rows && resp.rows[0] !== undefined && resp.rows[0].id) {
                    utils.setFlash(req.session, "An user with the same email address or with the same name already exists.", 'danger');
                    res.redirect('/register');
                } else {
                    db.query('SELECT login_token FROM users', function (err, resp) {
                        if (err) throw err;

                        var login_token;

                        do {
                            login_token = utils.createToken(100);
                        } while (resp.rows.filter(function (e) {return e.login_token == login_token;}).length > 0);

                        db.query('INSERT INTO users (firstname, lastname, email, password, login_token, privileges) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [
                            req.body.first_name,
                            req.body.last_name,
                            req.body.email,
                            req.body.password.hashCode(),
                            login_token,
                            1
                        ], function (err, resp) {
                            if (err) throw err;

                            var lastID = resp.rows[0].id;

                            db.query('SELECT * FROM users WHERE id=$1', [lastID], function (err, resp) {
                                if (err) throw err;

                                if (resp.rows && resp.rows[0] !== undefined) {
                                    req.session.authentified = true;
                                    req.session.user = resp.rows[0];
                                    res.cookie('user_token', resp.rows[0].login_token, {expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)});

                                    utils.setFlash(req.session, "Account created successfully!", 'success');
                                    res.redirect('/');
                                } else {
                                    utils.setFlash(req.session, "An error has occured.", 'danger');
                                    res.redirect('/register');
                                }
                            });
                        });
                    });
                }
            });
        }
    } else {
        utils.setFlash(req.session, "Registration is currently not allowed (Reason: demo mode is activated).", 'warning');
        res.redirect('/register');
    }
});

module.exports = router;
