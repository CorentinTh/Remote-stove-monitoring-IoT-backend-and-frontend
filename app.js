// Small config
process.env.allow_register = true;

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lessMiddleware = require('less-middleware');
var validator = require('express-validator');
var session = require('express-session')({secret: "j5S6YAMydd", resave: false, saveUninitialized: true});
var debug = require('debug')('gui:server');
var http = require('http');
//var sqlite3 = require('sqlite3').verbose();
var pg  = require('pg');
var sharedsession = require("express-socket.io-session");

var app = express();

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
var server = http.createServer(app);

db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
});

db.connect();
/*
db = new sqlite3.Database('./db/database.ht.db', function (err) {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the database.');
    }
});*/

ioSocketsUsers = {};
ioSocketsGroups = {};

String.prototype.hashCode = function () {
    var hash = 0;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++) {
        char = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

String.prototype.shuffle = function () {
    var a = this.split("");
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)),
            tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a.join("");
};

app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));      // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));            // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/chart.js/dist'));          // redirect Chart.js
app.use('/js', express.static(__dirname + '/node_modules/moment/min'));             // redirect Moment.js
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));    // redirect CSS bootstrap
app.use('/fonts', express.static(__dirname + '/node_modules/bootstrap/fonts'));     // rediresct CSS bootstrap
app.use('/favicons', express.static(path.join(__dirname, 'public', 'images', 'favicons')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(validator());
app.use(session);

// Checking that the user is connected
app.use(function (req, res, next) {
    // Checking if the user is logged in
    if (req.session.authentified) {
        return next();
    } else {

        // If not, we check if it has a cookie containing an user token
        if (req.cookies.user_token) {
            //db.get('SELECT * FROM users WHERE login_token=?', [req.cookies.user_token], function (err, rows) {
            db.query('SELECT * FROM users WHERE login_token=$1', [req.cookies.user_token], function (err, resp) {
                if (err) throw err;

                if (resp.rows && resp.rows[0] !== undefined) {
                    req.session.user = resp.rows[0];
                    req.session.authentified = true;
                    next();
                } else {
                    res.clearCookie('user_token');
                    res.redirect('/login')
                }
            });
        } else {
            // Checking if we are on a page that doesn't require to be logged in
            if (req.url.match(/^\/(login|register|interface|demo|about)/i)) {
                return next();
            } else {
                res.redirect('/login')
            }
        }
    }
});

app.use(function (req, res, next) {
    if (req.session.authentified) {
        res.locals.commons = {
            user: {
                authentified: req.session.authentified,
                privileges: req.session.user.privileges,
                firstname: req.session.user.firstname,
                lastname: req.session.user.lastname,
                email: req.session.user.email,
                id: req.session.user.id
            }
        };
    } else {
        res.locals.commons = {
            user: {
                authentified: false
            }
        };
    }

    res.locals.commons.flash = req.session.flash != undefined ? req.session.flash : [];
    req.session.flash = [];

    next();
});

// Sockets
var io = require('socket.io')(server);
io.use(sharedsession(session));
app.io = io;
require('./socket/socket')(io);

// Routes
app.use('/', require('./routes/index'));
app.use('/login', require('./routes/login'));
app.use('/user', require('./routes/user'));
app.use('/disconnect', require('./routes/disconnect'));
app.use('/register', require('./routes/register'));
app.use('/device', require('./routes/device'));
app.use('/contact', require('./routes/contact'));
app.use('/interface', require('./routes/interface'));
app.use('/group', require('./routes/group'));
app.use('/about', require('./routes/about'));
app.use('/demo', require('./routes/demo'));


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error', {noMenu: true});
});

if (app.get('env') === 'development') {
    app.locals.pretty = true;
}


// Server configuration
/*
 var port = normalizePort(process.env.PORT || '3000');
 app.set('port', port);
 var server = http.createServer(app);

 var io = require('socket.io')(server);
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}

//module.exports = app;
