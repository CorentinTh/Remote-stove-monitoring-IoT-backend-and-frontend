var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');


router.get('/all', function (req, res, next) {

    var dataToView = {
        title: 'My devices'
    };

    if (req.session.user.user_group_id != null) {
        db.query('SELECT id, name FROM user_groups WHERE id=$1', [req.session.user.user_group_id], function (err, resp) {
            if (err) throw err;

            dataToView.group = resp.rows[0];

            db.query('SELECT * FROM devices WHERE user_group_id=$1 AND user_id!=$2', [resp.rows[0].id, req.session.user.id], function (err, resp) {
                if (err) throw err;

                if (resp.rows && resp.rows.length > 0) {
                    dataToView.devices_group = resp.rows;
                }

                db.query('SELECT * FROM devices WHERE user_id=$1', [req.session.user.id], function (err, resp) {
                    if (err) throw err;

                    if (resp.rows && resp.rows.length > 0) {
                        dataToView.devices_owned = resp.rows;
                    }

                    res.render('devices/all', dataToView);
                });
            });
        });

    } else {
        db.query('SELECT * FROM devices WHERE user_id=$1', [req.session.user.id], function (err, resp) {
            if (err) throw err;

            if (resp.rows && resp.rows.length > 0) {
                dataToView.devices_owned = resp.rows;
            }

            res.render('devices/all', dataToView);
        });
    }
});

router.get('/add', function (req, res, next) {
    res.render('devices/add', {title: 'Add a device'});
});

router.post('/add', function (req, res, next) {
    if (!utils.isReadOnly(req.session.user)) {
        req.check('reference', 'Reference number must be set.').exists().notEmpty().trim();

        var errors = req.validationErrors();
        if (errors) {
            for (var i = 0; i < errors.length; i++) {
                utils.setFlash(req.session, errors[i].msg, 'danger');
            }

            res.redirect('/device/add');
        } else {

            db.query('SELECT user_id,id FROM devices WHERE serial_number=$1', [req.body.reference], function (err, resp) {
                if (err) throw err;

                var rows = resp.rows;

                if (rows && rows[0]) {
                    if (rows[0].user_id == null) {
                        //res.redirect('/device/configuration/' + rows[0].id);

                        db.query('UPDATE devices SET user_id=$1 WHERE id=$2', [req.session.user.id, rows[0].id], function (err) {
                            if (err) throw err;
                        });

                        utils.setFlash(req.session, "Device added with success.", 'success');
                        res.redirect('/device/all');
                    } else if (!isNaN(parseFloat(rows[0].user_id)) && isFinite(rows[0].user_id)) {
                        utils.setFlash(req.session, "This device has already been added by someone. (Maybe you?)", 'warning');
                        res.redirect('/device/add');
                    } else {
                        utils.setFlash(req.session, "Error #de-ad1. Please contact us. sorry for the inconvenience.", 'danger');
                        res.redirect('/device/add');
                    }
                } else {
                    utils.setFlash(req.session, "No such device, you must have made a typo.", 'danger');
                    res.redirect('/device/add');
                }
            });

        }
    } else {
        utils.setFlash(req.session, "You are not allowed to perform this action. Reason: Your account type is <strong>read-only</strong>.", 'warning');
        res.redirect('/');
    }
});

router.get('/configuration/:id', function (req, res, next) {
    req.check('id', 'Error fetching serial number. Please contact us. Error code: #de-co1.').exists().notEmpty().trim();

    var errors = req.validationErrors();
    if (errors) {
        for (var i = 0; i < errors.length; i++) {
            utils.setFlash(req.session, errors[i].msg, 'danger');
        }

        res.redirect('/');
    } else {
        db.query('SELECT user_id,id,type FROM devices WHERE id=$1', [req.params.id], function (err, resp) {
            if (err) throw err;

            if (resp.rows && resp.rows.length > 0) {
                var device = resp.rows[0];

                if (device.user_id == null || !isNaN(parseFloat(device.user_id)) && isFinite(device.user_id)) {
                    if (device.user_id == null || device.user_id == req.session.user.id) {
                        var dataToView = {
                            hasConfig: false,
                            title: "Configuration"
                        };

                        db.query('SELECT * FROM devices_configuration WHERE device_id=$1', [device.id], function (err, resp) {
                            if (err) throw err;

                            if (resp.rows && resp.rows.length > 0) {
                                dataToView.hasConfig = true;
                                dataToView.config = JSON.parse(resp.rows[0]);
                            }

                            res.render('devices/' + device.type + '/configuration', dataToView);
                        })

                    } else {
                        utils.setFlash(req.session, "Can't find your device.", 'danger');
                        res.redirect('/');
                    }
                } else {
                    utils.setFlash(req.session, "Error #de-co1. Please contact us. sorry for the inconvenience.", 'danger');
                    res.redirect('/');
                }
            } else {
                utils.setFlash(req.session, "No such device found.", 'danger');
                res.redirect('/');
            }
        });
    }
});

router.get('/:id', function (req, res, next) {
    req.check('id', "Error: no such device.").exists().isNumeric().notEmpty().trim();

    var errors = req.validationErrors();
    if (errors) {
        for (var i = 0; i < errors.length; i++) {
            utils.setFlash(req.session, errors[i].msg, 'danger');
        }

        res.redirect('/');
    } else {
        db.query('SELECT id, type, name, allows_notifications FROM devices WHERE id=$1 OR user_group_id=$2', [req.params.id, req.session.user.user_group_id], function (err, resp) {

            if (err) throw err;

            if (resp.rows && resp.rows[0] && resp.rows[0].id) {
                var device = resp.rows[0];

                db.query('SELECT * FROM devices_data WHERE device_id=$1 ORDER BY id DESC LIMIT 10', [device.id], function (err, resp) {
                    if (err) throw err;

                    var dataToView = {
                            title: device.name,
                            jquery_ui: true,
                            settings: {
                                allows_notifications: device.allows_notifications
                            }
                        },
                        data = [];

                    resp.rows.forEach(function (row) {
                        data.push(JSON.parse(row.data.replace(/[\\]/gi, '')));
                    });

                    data.sort(function (a, b) {
                        return a.timestamp > b.timestamp;
                    });

                    dataToView.deviceData = data;

                    db.query('SELECT * FROM time_ranges WHERE reference_table=$1 AND reference_id=$2 AND type=$3',
                        [
                            'users',
                            req.session.user.id,
                            'device' + device.id + '_notification_period'
                        ], function (err, resp) {
                            if (err) throw err;

                            dataToView.time_ranges = resp.rows;

                            res.render('devices/' + device.type + '/device', dataToView);

                        });

                });

            } else {
                utils.setFlash(req.session, "Can't get this device.", 'danger');
                res.redirect('/device/all');
            }
        })


    }
});

module.exports = router;
