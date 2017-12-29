'use strict';

function setNotificationTitle(n){

    if(n != '' && n > 0){
        document.title = '(' + n + ') ' + document.title.replace(/^\([0-9]*\) /, '');
    }else{
        document.title = document.title.replace(/^\([0-9]*\) /, '');
    }
}

function setBadgeNotification(n){
    if(n != '' && n > 0){
        $('.notification-count').html(n);
    }else{
        $('.notification-count').html('');
    }
}

function getBadgeNotification(){
    var n = parseInt($('.notification-count').html(), 10);

    return isNaN(n) ? 0 : n;
}

function addNotification(text, link, read, id, option) {

    var icon = option !== undefined ? option.icon !== undefined ? option.icon : "exclamation-triangle" : "exclamation-triangle";
    var notification = $("<a id='n_" + id + "' href='" + link + "' class='list-group-item notification" + (read ? "" : " unseen") + "' onclick='notification_clicked(event, " + id + ", this)'></a>");

    notification.append($("<i aria-hidden='true' class='fa fa-" + icon + "'></i>"));
    notification.append($("<span class='notification-message'>" + text + "</span>"));

    $(".notification-list").prepend(notification);
}

function notification_clicked(event, id, aElement) {
    event.preventDefault();
    if($(aElement).hasClass('unseen')){
        socket.emit("notification_seen", {id:id});
    }

    window.location= $(aElement).attr('href');
}

function notification_seen(id){
    var aElement = document.getElementById('n_' + id);

    aElement.classList.remove('unseen');

    var notificationCount = getBadgeNotification()-1;

    setNotificationTitle(notificationCount);
    setBadgeNotification(notificationCount);
}

