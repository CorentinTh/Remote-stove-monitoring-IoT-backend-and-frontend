/**
 * Created by Corentin THOMASSET on 31/10/2017.
 */

socket.on('init', function (data) {

});

socket.on('get_all_notifications', function (data) {

    for (var i = 0; i < data.rows.length; i++) {
        var row = data.rows[i];
        var options;

            if(row.options !== null && row.options !== undefined){
            options = JSON.parse(row.options);
        }

        addNotification(row.content, row.link, row.seen === 1, row.id, options);
    }


    setNotificationTitle(data.countUnseen);
    setBadgeNotification(data.countUnseen);

});


socket.on('new_notification', function (data) {
    console.log('New notification:');
    console.log(data);
    addNotification(data.content, data.link, 0, data.id, data.options);

    var notificationCount = getBadgeNotification()+1;

    setNotificationTitle(notificationCount);
    setBadgeNotification(notificationCount);
});


socket.on('notification_seen', function (data) {
    notification_seen(data.id);
});




