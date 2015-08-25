var webhook = require('express-ifttt-webhook');
var express = require('express');
var bodyParser = require('body-parser')
var routes = require('./routes');
var writeWorkTime = require('./write_work_time');

require('dotenv').load();

var app = express();

var months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

var methods = {
	enter_exit_work: function(data, done) {
		writeWorkTime(data.username);
		done();
	}
};

app.use(webhook(methods));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('view options', {layout: false});
app.set('basepath', __dirname + '/views')

app.get('/', routes.root);
app.post('/check', routes.check);
app.post('/editDay/:dayIndex', routes.editDay);

// Способ запускать методы через обычный запрос
app.post('/method', routes.method);

app.listen(7016);
