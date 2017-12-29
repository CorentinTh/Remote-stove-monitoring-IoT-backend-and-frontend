var utils = require('../functions/function.js');


module.exports = function (io) {
    io.on('connection', function (socket) {

        // Stuff done wen connection
        try {
            // Getting and sending the notification list
            db.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY id ASC LIMIT 10', [socket.handshake.session.user.id], function (err, resp) {
                if (err) throw err;
                var notifications = resp.rows;

                // Unseen notification count
                db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id=$1 AND seen=$2', [socket.handshake.session.user.id, 0], function (err, resp) {
                    if (err) throw err;

                    socket.emit('get_all_notifications', {rows: notifications, countUnseen: resp.rows[0].count});
                });

            });


            // Storing user sockets
            if (!ioSocketsUsers[socket.handshake.session.user.id]) {
                ioSocketsUsers[socket.handshake.session.user.id] = new Set();
            }
            ioSocketsUsers[socket.handshake.session.user.id].add(socket);

            // Storing user group sockets
            if (socket.handshake.session.user.user_group_id) {
                if (!ioSocketsGroups[socket.handshake.session.user.user_group_id]) {
                    ioSocketsGroups[socket.handshake.session.user.user_group_id] = new Set();
                }
                ioSocketsGroups[socket.handshake.session.user.user_group_id].add(socket);
            }

        } catch (e) {
            console.log("[Warning] -> Refresh the page.");
        }

        socket.on('notification_seen', function (data) {
            db.query('UPDATE notifications SET seen=1 WHERE id=$1', [data.id], function (err) {
                if (err) throw err;
            });

            ioSocketsUsers[socket.handshake.session.user.id].forEach(function (socket) {
                socket.emit('notification_seen', {id: data.id});
            });
        });

        socket.on('manage-sliders', function (data) {

            if (utils.isReadOnly(socket.handshake.session.user)) {
                return;
            }


            if (data.type != "create" && data.type != "delete" && data.type != "update") {
                console.log("Error in function 'manageSliders");
                return;
            }

            if (data.type == "create") {

                db.query('INSERT INTO time_ranges (reference_table, reference_id, type, range_from, range_to) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    [
                        'users',
                        socket.handshake.session.user.id,
                        'device' + data.device_id + '_notification_period',
                        0,
                        300
                    ], function (err, resp) {
                        if (err) throw err;

                        var ID = resp.rows[0].id;

                        ioSocketsUsers[socket.handshake.session.user.id].forEach(function (socket) {
                            socket.emit('manage-sliders', {type: "create", id: ID, values: [0, 300]});
                        });

                        console.log(ioSocketsUsers);
                    });


            } else if (data.type == "update") {

                db.query('UPDATE time_ranges SET range_from=$1, range_to=$2 WHERE id=$3', [data.values[0], data.values[1], data.id], function (err) {
                    if (err) throw err;
                });

                ioSocketsUsers[socket.handshake.session.user.id].forEach(function (socket) {
                    socket.emit('manage-sliders', {type: "update", id: data.id, values: data.values});
                });


            } else if (data.type == "delete") {

                db.query('DELETE FROM time_ranges WHERE id=$1', [data.id], function (err) {
                    if (err) throw err;
                });

                ioSocketsUsers[socket.handshake.session.user.id].forEach(function (socket) {
                    socket.emit('manage-sliders', {type: "delete", id: data.id});
                });
            }
        });

        socket.on('device-settings', function (data) {

            if (utils.isReadOnly(socket.handshake.session.user)) {
                return;
            }

            if (data.type === 'allow-notifications') {
                db.query('UPDATE devices SET allows_notifications=$1 WHERE id=$2', [data.data ? 1 : 0, data.device_id], function (err) {
                    if (err) throw err;
                });

                ioSocketsGroups[socket.handshake.session.user.user_group_id].forEach(function (socket) {
                    socket.emit('device-settings', data);
                });
            } else if (data.type === 'change-name') {
                db.query('UPDATE devices SET name=$1 WHERE id=$2', [data.data, data.device_id], function (err) {
                    if (err) throw err;
                });

                ioSocketsGroups[socket.handshake.session.user.user_group_id].forEach(function (socket) {
                    socket.emit('device-settings', data);
                });
            }
        });

        socket.on('disconnect', function (data) {

            if (!socket.handshake.session.user) return;

            if (ioSocketsUsers[socket.handshake.session.user.id]) {
                ioSocketsUsers[socket.handshake.session.user.id].delete(socket);
                if (ioSocketsUsers[socket.handshake.session.user.id].size === 0) {
                    delete ioSocketsUsers[socket.handshake.session.user.id];
                }
            }

            if (socket.handshake.session.user.user_group_id) {
                if (ioSocketsUsers[socket.handshake.session.user.user_group_id]) {
                    ioSocketsUsers[socket.handshake.session.user.user_group_id].delete(socket);
                    if (ioSocketsUsers[socket.handshake.session.user.user_group_id].size === 0) {
                        delete ioSocketsUsers[socket.handshake.session.user.user_group_id];
                    }
                }
            }
        });

    });
};

