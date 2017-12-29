var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');

router.get('/:userid', function (req, res, next) {
    if (req.params.userid) {
        if (req.params.userid == "me" || req.params.userid == req.session.user.id) {

            var dataToView = {
                title: (req.session.user.firstname + " " + req.session.user.lastname),
                user: req.session.user,
                own_account: true
            };

            if (req.session.change_password_form && req.session.change_password_form.errors) {
                dataToView.change_password_errors = req.session.change_password_form.errors;
                delete req.session.change_password_form.errors;
            }

            if (req.session.change_email_form && req.session.change_email_form.errors) {
                dataToView.change_email_errors = req.session.change_email_form.errors;
                delete req.session.change_email_form.errors;
            }

            res.render('user', dataToView);

        } else if (!isNaN(parseFloat(req.params.userid)) && isFinite(req.params.userid)) {

            if(utils.isReadOnly(req.session.user)){
                res.redirect('/');
            }else{
                db.query('SELECT * FROM users WHERE id=$1', [req.params.userid], function (err, resp) {
                    if (err) throw err;

                    if (resp.rows && resp.rows[0] !== undefined && resp.rows[0].id !== undefined) {
                        res.render('user', {
                            title: (resp.rows[0].firstname + " " + resp.rows[0].lastname),
                            user: resp.rows[0],
                            own_account: false
                        });

                    } else {
                        res.redirect('/');
                    }
                })
            }
        } else {
            res.redirect('/');
        }
    }
});


router.post('/change-password', function (req, res, next) {

    if (!utils.isReadOnly(req.session.user)) {
        req.session.change_password_form = {};

        req.check('currentpassword', 'Current password field must be set.').exists().notEmpty().trim();
        req.check('currentpassword', 'Current password is not correct.').custom(function (value) {
            return value.hashCode() == req.session.user.password;
        }).trim();
        req.check('newpassword', 'New password field must be set.').exists().notEmpty().trim();
        req.check('repeatnewpassword', 'Repeat new password field must be set.').exists().notEmpty().trim();
        req.check('repeatnewpassword', "Passwords does not match").equals(req.body.newpassword).trim();

        var errors = req.validationErrors();

        if (errors) {
            req.session.change_password_form.errors = errors;
            res.redirect('/user/me');
        } else {

            db.query('UPDATE users SET password=$1 WHERE id=$2', [
                req.body.newpassword.hashCode(),
                req.session.user.id
            ], function (err) {
                if (err) throw err;

                utils.setFlash(req.session, "Password changed succefully", 'success');
                req.session.user.password = req.body.newpassword.hashCode();
                res.redirect('/user/me');
            })
        }
    } else {
        utils.setFlash(req.session, "You are not allowed to perform this action. Reason: Your account type is <strong>read-only</strong>.", 'warning');
        res.redirect('/user/me');
    }
});


router.post('/change-email', function (req, res, next) {
    if (!utils.isReadOnly(req.session.user)) {
        req.session.change_email_form = {};

        req.check('currentpassword', 'Current password must be set.').exists().notEmpty().trim();
        req.check('currentpassword', 'Current password is not correct.').custom(function (value) {
            return value.hashCode() == req.session.user.password;
        }).trim();
        req.check('email', 'Email field must be set.').exists().notEmpty().trim();

        var errors = req.validationErrors();

        if (errors) {
            req.session.change_email_form.errors = errors;
            res.redirect('/user/me');
        } else {

            db.query('UPDATE users SET email=$1 WHERE id=$2', [
                req.body.email,
                req.session.user.id
            ], function (err) {
                if (err) throw err;

                utils.setFlash(req.session, "Email changed succefully", 'success');
                req.session.user.email = req.body.email;
                res.redirect('/user/me');
            })
        }

    } else {
        utils.setFlash(req.session, "You are not allowed to perform this action. Reason: Your account type is <strong>read-only</strong>.", 'warning');
        res.redirect('/user/me');
    }
});

module.exports = router;
