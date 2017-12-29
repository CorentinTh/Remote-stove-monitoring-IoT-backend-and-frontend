var express = require('express');
var router = express.Router();
var utils = require('../functions/function.js');

/* GET home page. */
router.get('/', function (req, res, next) {

    //req.app.io.sockets.emit('new_notification', {zaeaz:'1'});
    //req.app.io.sockets.emit('tx', {data:'erz'});
    //req.app.io.to(req.session.socketID).emit('new_notification', {zaeaz:'1'});

    var dataToView = {
        title: 'Home'
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

                    res.render('index', dataToView);
                });
            });
        });

    } else {
        db.query('SELECT * FROM devices WHERE user_id=$1', [req.session.user.id], function (err, resp) {
            if (err) throw err;

            if (resp.rows && resp.rows.length > 0) {
                dataToView.devices_owned = resp.rows;
            }

            res.render('index', dataToView);
        });
    }


});

module.exports = router;
