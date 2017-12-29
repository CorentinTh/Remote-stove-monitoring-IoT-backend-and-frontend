/**
 * Created by Corentin THOMASSET on 31/10/2017.
 */

module.exports = {
    setFlash: function (session, message, type) {
        if (type != "success" && type != "danger" && type != "warning") type = "success";

        if (!session.flash) session.flash = [];

        session.flash.push({message: message, type: type});
    },

    createToken: function (length) {
        return str = "AZERTYUIOPQSDFGHJKLMWXCVBNazertyuiopqsdfghjklmwxcvbn0123456789".repeat(62).shuffle().substring(0, length);
    },

    addNotification: function (id, message, link, options) {

        db.query('INSERT INTO notifications (user_id, seen, content, link, options, timestamp) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [
            id,
            0,
            message,
            link,
            JSON.stringify(options),
            Date.now()
        ], function (err, resp) {
            if (err) throw err;

            var lastID = resp.rows[0].id;

            if (!ioSocketsUsers[id]) {
                console.log('addNotification: no socket ID');
            } else {

                ioSocketsUsers[id].forEach(function (socket) {
                    socket.emit('new_notification', {
                        content: message,
                        id: lastID,
                        link: link,
                        options: options
                    });
                });

            }
        });
    },

    isReadOnly: function (user) {
        return user.privileges <= 1;
    },

    addData: function (req, device_id, data) {

        db.query("INSERT INTO devices_data (data, reception_timestamp, device_id) VALUES ($1, $2, $3)", [
            data,
            Date.now(),
            device_id
        ], function (err) {
            if (err) throw err;

            ioSocketsUsers[req.session.user.id].forEach(function (socket) {
                socket.emit('new_data_to_display', {
                    data: data,
                    device_id: device_id
                });
            });
        });
    }
};

