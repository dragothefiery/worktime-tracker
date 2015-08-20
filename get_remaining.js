require('sugar');
var moment = require('moment');
var sequelize = require('./db');

var weekdays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

var WORK_DAY_MINUTES = 8.5 * 60;

function minutesToHuman(minutes) {
	var hours = (minutes / 60).floor();
	var hoursMinutes = minutes % 60;
	return hours + ' ч. ' + hoursMinutes + ' мин.';
}

function minutesToString(username) {
	
	// Общее количество минут
	var totalMinutes = WORK_DAY_MINUTES * 5;
	
	// Сколько минут осталось
	var leftMinutes = totalMinutes;
	
	// Берем время работы с начала недели
	var startOfWeek = moment().startOf('isoweek').format('YYYY-MM-DD');
	
	// Количество прошедших дней с начала недели = номеру сегодняшнего дня недели
	var daysPassed = moment().isoWeekday();
// 	var daysPassed = 4;

 	// Не учитываем выходные
	if(daysPassed > 5) daysPassed = 5;
	
	var workTimes = sequelize.query(
		"SELECT date, direction FROM work_times WHERE user_id = '" + username + "' AND DATE(date) >= '" + startOfWeek + "' ORDER BY date ASC", 
		{type: sequelize.QueryTypes.SELECT}
	);

	return workTimes.then(function(data) {
		var daysArray = getRemaining(data);
// 		console.log(daysArray);

		// Массив дней недели и данным по ним (в виде строк)
		var daysStringsArray = [];
		
		// Если некоторые дни были пропущены, считаем их как отработанные полный рабочий день
		leftMinutes -= (daysPassed - daysArray.length) * WORK_DAY_MINUTES;
		
		daysArray.forEach(function(day) {
			
			// Переработка или недоработка
			var overUnder = day.minutes > WORK_DAY_MINUTES ? 'переработка' : 'недоработка';
			var overUnderMinutes = Math.abs((leftMinutes >= WORK_DAY_MINUTES ? WORK_DAY_MINUTES : leftMinutes) - day.minutes);
			
			var str = weekdays[day.day] + ': ' + minutesToHuman(day.minutes);
			
			// Если день длился ровно 8 ч 30 мин, не показываем нулевую переработку/недоработку
			if(overUnderMinutes != 0) {
				str += ', ' + overUnder + ' ' + minutesToHuman(overUnderMinutes);
			}			
			daysStringsArray.push(str);
			
			leftMinutes -= day.minutes;
		});
		
		var lastDayMinutes = 0;
		if(daysArray.length > 0) lastDayMinutes = daysArray[daysArray.length - 1].minutes;
		
		// Подсчет окончания рабочего дня
		// Если на неделе осталось отработать больше одного рабочего дня, тогда считаем с учетом того, что уже было отработано сегодня
		// В противном случае (по пятницам, например), конец дня это сейчас + сколько осталось отработать всего
		var endOfCurrentDay = moment().add((leftMinutes >= WORK_DAY_MINUTES ? WORK_DAY_MINUTES - lastDayMinutes : leftMinutes), 'minutes');		

		return daysStringsArray.join('<br>') + '<br><br>Осталось ' + minutesToHuman(leftMinutes) + 
			'<br>Идеальный конец рабочего дня в ' + endOfCurrentDay.format('HH:mm');
	});	
};

// Получить соответствие дня недели и проработанных в этот день минут
function getRemaining(workTimes) {
	
	// Делим объекты просто на группы по 2 (вход и выход), они в идеале должны чередоваться
	var groups = workTimes.inGroupsOf(2, {});
	var data = groups.map(function(group) {
		
		// Находим объекты входа и выхода
		var inItem  = group.find(function(item) { return item.direction === 'in'; });
		var outItem = group.find(function(item) { return item.direction === 'out'; });
		
		var inDate = moment(inItem.date);
				
		// Если не было выхода, считаем его как сейчас
		if(outItem == null) {
			return {day: inDate.isoWeekday(), minutes: moment().diff(inDate, 'minutes')};
		}
		
		var outDate = moment(outItem.date);
		
		return {
			day: inDate.isoWeekday(),
			minutes: outDate.diff(inDate, 'minutes')
		};
	});
	
	
	
	return data;
};

module.exports = minutesToString;