const convertTo12HourFormat = (time24h) => {
	if (!time24h || typeof time24h !== "string" || !time24h.includes(":")) {
		return null;
	}
	var [hoursStr, minutesStr] = time24h.split(":");
	var hours = parseInt(hoursStr, 10);
	var minutes = parseInt(minutesStr, 10);

	if (isNaN(hours) || isNaN(minutes)) {
		return null;
	}

	var meridiem = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	hours = hours < 10 ? "0" + hours : hours;
	minutes = minutes < 10 ? "0" + minutes : minutes;
	return hours + ":" + minutes + " " + meridiem;
};

module.exports = convertTo12HourFormat;
