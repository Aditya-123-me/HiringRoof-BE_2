const convertTo12HourFormat = (time24h) => {
	var [hours, minutes] = (time24h ?? "")?.split(":");
	hours = parseInt(hours);
	minutes = parseInt(minutes);
	var meridiem = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	hours = hours < 10 ? "0" + hours : hours;
	minutes = minutes < 10 ? "0" + minutes : minutes;
	return hours + ":" + minutes + " " + meridiem;
};

module.exports = convertTo12HourFormat;
