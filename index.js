var webhook = require('express-ifttt-webhook');
var sequelize = require('./db');
var moment = require('moment');
var express = require('express');
var bodyParser = require('body-parser')

var getRemaining = require('./get_remaining');

require('dotenv').load();

var app = express();

var months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

writeWorkTime = function(username) {
	
// 	var match = time.match('([a-zA-Z]+) ([0-9]+), ([0-9]+) at ([0-9]+):([0-9]+)([AP]M)');
// 	var date = match[3] + '-' + months.indexOf(match[1]) + '-' + match[2] + ' ' + (match[6] == 'AM' ? match[4] : (+match[4] + 12) + "") + ':' + match[5] + ':00';
// 	date = moment(date).subtract(1, 'hour');
	
	var date = moment();
	
	sequelize.query("SELECT * FROM work_times WHERE DATE(date) = '" + date.format('YYYY-MM-DD') + "' AND user_id = '" + username + "'")
	.spread(function(result) {
		
		var lastDirection = 'out';
		if(result.length) {
			lastDirection = result[result.length - 1].direction;
		}
		
		if(lastDirection === 'in') {
			lastDirection = 'out';			
		}
		else {
			lastDirection = 'in';
		}
		
		var query = "INSERT INTO work_times (date, direction, user_id) VALUES ('" + date.format('YYYY-MM-DD HH:mm:ss') +  "', '" + lastDirection + "', '" + username + "')";
		sequelize.query(query);	
	});	
};

var methods = {
	enter_exit_work: function(data, done) {
		writeWorkTime(data.username);
		done();
	}
};

app.use(webhook(methods));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); 

app.get('/', function(req, res, next) {	
	if(!req.query.username) {
		return res.send('No username')
	}	
	getRemaining(req.query.username).then(function(result) {
		res.send(result);	
	});	
});

// Способ запускать методы через обычный запрос
app.post('/method', function(req, res, next) {
	var methodName = req.query.methodName;
	
	if(Object.has(methods, methodName)) {
		methods[methodName](req.body, function(){});
		res.send('ok');
	}
	else {
		res.send('no method');		
	}	
});

app.listen(7016);
