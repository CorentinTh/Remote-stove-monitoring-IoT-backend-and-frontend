/**
 * Created by Corentin THOMASSET on 27/11/2017.
 */
var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');


router.get('/new', function (req, res, next) {
    if (req.session.user.user_group_id !== null) {
        res.redirect('/group/upgrade');
    } else {

        res.render('group/new', {title: 'Create a group'});
    }
});

router.post('/new', function (req, res, next) {

    if (!utils.isReadOnly(req.session.user)) {
        req.check('name', "Name required").exists().notEmpty().trim();

        var errors = req.validationErrors();
        if (errors) {
            for (var i = 0; i < errors.length; i++) {
                utils.setFlash(req.session, errors[i].msg, 'danger');
            }

            res.redirect('/group/new');
        } else {
            db.query('INSERT INTO user_groups (manager_id, name, invitation_token) VALUES ($1, $2, $3) RETURNING id',
                [
                    req.session.user.id,
                    req.body.name,
                    utils.createToken(60)
                ], function (err, resp) {
                    if (err) throw err;

                    var lastID = resp.rows[0].id;

                    db.query('UPDATE users SET user_group_id=$1 WHERE id=$2',
                        [
                            lastID,
                            req.session.user.id
                        ], function (err) {
                            if (err) throw err;

                            req.session.user.user_group_id = lastID;

                            res.redirect('/group');
                        });
                });

        }
    } else {
        utils.setFlash(req.session, "You are not allowed to perform this action. Reason: Your account type is <strong>read-only</strong>.", 'warning');
        res.redirect('/group');
    }
});

router.post('/add-person', function (req, res, next) {

    if (!utils.isReadOnly(req.session.user)) {
        req.check('person_email', "Name required").exists().notEmpty().isEmail().trim();

        var errors = req.validationErrors();
        if (errors) {
            for (var i = 0; i < errors.length; i++) {
                utils.setFlash(req.session, errors[i].msg, 'danger');
            }

            res.redirect('/group');
        } else {


            db.query('SELECT id, invitation_token FROM user_groups WHERE id=$1 AND manager_id=$2', [req.session.user.user_group_id, req.session.user.id], function (err, resp) {
                if (err) throw err;

                if (resp.rows && resp.rows[0] !== undefined) {
                    var user_groups = resp.rows[0];

                    db.query('SELECT id, firstname FROM users WHERE email=$1', [req.body.person_email], function (err, resp) {
                        if (err) throw err;

                        if (resp.rows && resp.rows[0] !== undefined) {
                            var invited_user = resp.rows[0];

                            var invitation =
                                invited_user.firstname.hashCode() +
                                invited_user.id.toString().hashCode() +
                                'azertyuiopqsdfghjklmwxcvbnAZERTYUIOPQSDFGHJKLMWXCVBN'.shuffle().charAt(0) +
                                user_groups.id +
                                'azertyuiopqsdfghjklmwxcvbnAZERTYUIOPQSDFGHJKLMWXCVBN'.shuffle().charAt(0) +
                                user_groups.invitation_token;

                            utils.addNotification(invited_user.id, req.session.user.lastname + ' ' + req.session.user.firstname + ' has invited you to a group.', '/group/invite/' + invitation, {icon: 'users'});
                            utils.setFlash(req.session, "An invitation has been sent to " + req.body.person_email, 'success');
                            res.redirect('/group');

                        } else {
                            utils.setFlash(req.session, "This user doesn't exists or do not have an account.", 'danger');
                            res.redirect('/group');
                        }
                    });
                } else {
                    utils.setFlash(req.session, "You seem to not be allowed to do that.", 'danger');
                    res.redirect('/group');
                }
            });
        }
    } else {
        utils.setFlash(req.session, "You are not allowed to perform this action. Reason: Your account type is <strong>read-only</strong>.", 'warning');
        res.redirect('/');
    }
});

router.post('/add-device', function (req, res, next) {
    req.check('device_id', "Device required").exists().notEmpty().trim();

    var errors = req.validationErrors();
    if (errors) {
        for (var i = 0; i < errors.length; i++) {
            utils.setFlash(req.session, errors[i].msg, 'danger');
        }

        res.redirect('/group');
    } else {
        db.query('SELECT id FROM devices WHERE id=$1 AND user_id=$2', [req.body.device_id, req.session.user.id], function (err, resp) {
            if (err) throw err;

            if (resp.rows && resp.rows[0] !== undefined) {

                db.query('UPDATE devices SET user_group_id=$1 WHERE id=$2', [req.session.user.user_group_id, req.body.device_id], function (err) {
                    if (err) throw err;
                    res.redirect('/group');
                });

            } else {
                utils.setFlash(req.session, "This device doesn't exists or is not yours.", 'danger');
                res.redirect('/group');
            }
        });
    }
});

router.get('/invite/:token', function (req, res, next) {
    req.check('token', 'Error').exists().notEmpty().matches(/^[0-9]+[a-zA-Z]{1}[0-9]+[a-zA-Z]{1}[a-zA-Z0-9]{60}$/).trim();

    var errors = req.validationErrors();
    if (errors) {
        utils.setFlash(req.session, "You seem to not be allowed to do that.", 'danger');
        res.redirect('/group');
    } else {
        var matches = req.params.token.match(/^([0-9]+)[a-zA-Z]{1}([0-9]+)[a-zA-Z]{1}([a-zA-Z0-9]{60})$/),
            user_hash = matches[1],
            group_id = matches[2],
            group_token = matches[3];

        if (req.session.user.user_group_id == group_id) {
            utils.setFlash(req.session, "You are already in this group", 'warning');
            res.redirect('/group');
        } else {
            if (user_hash != (req.session.user.firstname.hashCode() + req.session.user.id.toString().hashCode())) {
                utils.setFlash(req.session, "You seem to not be allowed to do that.", 'danger');
                res.redirect('/group');
            } else {
                db.query('SELECT id, name, manager_id FROM user_groups WHERE id=$1 AND invitation_token=$2', [group_id, group_token], function (err, resp) {
                    if (err) throw err;

                    if (resp.rows && resp.rows[0] !== undefined) {

                        var group = resp.rows[0];

                        db.query('SELECT firstname, lastname, email FROM users WHERE id=$1', [group.manager_id], function (err, resp) {
                            if (err) throw err;

                            res.render('group/invite', {
                                title: 'Group invitation',
                                group: group,
                                manager: resp.rows[0]
                            });
                        });
                    } else {
                        utils.setFlash(req.session, "You seem to not be allowed to do that.", 'danger');
                        res.redirect('/group');
                    }
                });
            }
        }
    }
});

router.post('/invite/:token', function (req, res, next) {
    req.check('token', 'Error').exists().notEmpty().matches(/^[0-9]+[a-zA-Z]{1}[0-9]+[a-zA-Z]{1}[a-zA-Z0-9]{60}$/).trim();
    req.check('submit', 'Error').exists().notEmpty().custom(function (value) {
        return value === 'accept' || value === 'decline';
    }).trim();

    var errors = req.validationErrors();
    if (errors) {
        utils.setFlash(req.session, "You seem to not be allowed to do that.", 'danger');
        res.redirect('/group');
    } else {
        var matches = req.params.token.match(/^([0-9]+)[a-zA-Z]{1}([0-9]+)[a-zA-Z]{1}([a-zA-Z0-9]{60})$/),
            user_hash = matches[1],
            group_id = matches[2],
            group_token = matches[3];

        if (req.session.user.user_group_id == group_id) {
            utils.setFlash(req.session, "You are already in this group", 'warning');
            res.redirect('/group');
        } else {
            if (user_hash != (req.session.user.firstname.hashCode() + req.session.user.id.toString().hashCode())) {
                utils.setFlash(req.session, "You seem to not be allowed to do that.", 'danger');
                res.redirect('/group');
            } else {
                if (req.body.submit == 'accept') {
                    db.query('SELECT id, name, manager_id FROM user_groups WHERE id=$1 AND invitation_token=$2', [group_id, group_token], function (err, resp) {
                        if (err) throw err;

                        if (resp.rows && resp.rows[0] !== undefined) {
                            db.query('UPDATE users SET user_group_id=$1 WHERE id=$2', [group_id, req.session.user.id], function (err, resp) {
                                if (err) throw err;
                            });

                            req.session.user.user_group_id = group_id;
                            utils.setFlash(req.session, "Successfully joined this group.", 'success');
                            res.redirect('/group');
                        } else {
                            utils.setFlash(req.session, "You seem to not be allowed to do that.", 'danger');
                            res.redirect('/group');
                        }
                    });

                } else if (req.body.submit == 'decline') {
                    utils.setFlash(req.session, "Invitation declined successfully", 'success');
                    res.redirect('/group');
                }
            }
        }
    }
});

router.get('/:upgrade?', function (req, res, next) {

    if (req.session.user.user_group_id !== null) {

        db.query('SELECT id, name, manager_id FROM user_groups WHERE id=$1', [req.session.user.user_group_id], function (err, resp) {
            if (err) throw err;

            var dataToView = {
                title: 'Groups',
                group_name: resp.rows[0].name,
                no_group: false,
                is_manager: resp.rows[0].manager_id == req.session.user.id,
                upgrade_modal_on: req.params.upgrade !== undefined
            };

            db.query('SELECT id, firstname, lastname FROM users WHERE user_group_id=$1', [req.session.user.user_group_id], function (err, resp) {
                if (err) throw err;

                dataToView.group_users = resp.rows;

                db.query('SELECT id, name FROM devices WHERE user_group_id=$1', [req.session.user.user_group_id], function (err, resp) {
                    if (err) throw err;

                    dataToView.group_devices = resp.rows;

                    db.query('SELECT id, name FROM devices WHERE user_id=$1', [req.session.user.id], function (err, resp) {
                        if (err) throw err;

                        dataToView.user_devices = resp.rows;

                        res.render('group/group', dataToView);
                    });
                });
            });
        });
    } else {
        var dataToView = {
            title: 'Groups',
            no_group: true,
            upgrade_modal_on: req.params.upgrade !== undefined
        };

        res.render('group/group', dataToView);
    }
});

module.exports = router;