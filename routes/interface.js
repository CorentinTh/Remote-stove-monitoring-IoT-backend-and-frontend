var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');


function timestampInInterval(timestamp, from_int, to_int) {
    var hours = new Date(timestamp).getHours(),
        minutes = new Date(timestamp).getMinutes(),
        time = hours * 60 + minutes;

    return time >= from_int && time <= to_int;
}

router.post('/sync', function (req, res, next) {
    res.send('/sync received: ' + JSON.stringify(req.body));
});

router.post('/live', function (req, res, next) {
    req.check('token').exists().notEmpty().trim();

    var errors = req.validationErrors();
    if (errors) {
        res.send('false');
    } else {

        db.query('SELECT id, user_group_id  FROM devices WHERE token=$1', [req.body.token], function (err, resp) {
            if (err) throw err;

            if (resp.rows && resp.rows[0] !== undefined) {
                delete req.body.token;

                var device = resp.rows[0];

                req.app.io.sockets.emit('new_data_live', {
                    data: req.body,
                    device_id: device.id
                });

                /*if (ioSocketsGroups &&
                    ioSocketsGroups.hasOwnProperty(device.user_group_id)) {

                    ioSocketsGroups[device.user_group_id].forEach(function (socket) {
                        socket.emit('new_data_live', {
                            data: req.body,
                            device_id: device.id
                        });
                    });
                }*/

            } else {
                console.log("Device unidentified post data to live");
                res.send('false');
            }
        });

        res.send('true');
    }
});

router.post('/send-data', function (req, res, next) {
    req.check('token').exists().notEmpty().trim();

    var errors = req.validationErrors();
    if (errors) {
        res.send('false');
    } else {

        db.query('SELECT * FROM devices WHERE token=$1', [req.body.token], function (err, resp) {
            if (err) throw err;

            if (resp.rows && resp.rows[0] !== undefined) {

                var device = resp.rows[0];

                delete req.body.token;


                if (ioSocketsGroups &&
                    ioSocketsGroups.hasOwnProperty(device.user_group_id)) {

                    ioSocketsGroups[device.user_group_id].forEach(function (socket) {

                        socket.emit('new_data_to_display', {
                            data: req.body,
                            device_id: device.id
                        });
                    });
                }


                db.query('INSERT INTO devices_data (data, reception_timestamp, device_id) values ($1, $2, $3)',
                    [
                        JSON.stringify(req.body),
                        Math.floor(Date.now() / 1000),
                        device.id
                    ], function (err) {
                        if (err) throw err;
                    });


                if (req.body.timestamp && device.allows_notifications == 1 && req.body.timestamp > (device.last_notification + 30 * 60) && (device.threshold && eval(device.threshold))) {
                    console.log((device.last_notification + 30 * 60) + "  " + req.body.timestamp);


                    db.query("SELECT * FROM time_ranges WHERE reference_table=$1 AND type=$2", ['users', 'device' + device.id + 'notification_period'], function (err, resp) {
                        if (err) throw err;

                        if (resp.rows && resp.rows[0] !== undefined) {
                            var rows = resp.rows;

                            for (var i = 0; i < rows.length; i++) {
                                var obj = rows[i];
                                if (timestampInInterval(req.body.timestamp * 1000, obj.range_from, obj.range_to)) {
                                    utils.addNotification(obj.reference_id, "Your plates are on!", "/device/" + device.id, {icon: "free-code-camp"});
                                    break;
                                }
                            }
                        }

                    });

                    db.query("UPDATE devices SET last_notification=$1 WHERE id=$2", [Math.floor(Date.now() / 1000), device.id], function (err, resp) {
                        if (err) throw err;
                    })
                }

                res.send('true');

            } else {
                console.log("Device unidentified");
                res.send('false');
            }
        });
    }
});

module.exports = router;
