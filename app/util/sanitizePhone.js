const sanitizePhone = (phoneStr) => {
	if (!phoneStr) return "";
	// Convert to string and remove all spaces, dashes, parentheses
	let cleaned = String(phoneStr).replace(/[\s\-\(\)]/g, "");
	
	// If it starts with '+', remove it
	if (cleaned.startsWith("+")) {
		cleaned = cleaned.substring(1);
	}
	
	// If it has 12 digits and starts with '91' (Indian country code), strip '91'
	if (cleaned.length === 12 && cleaned.startsWith("91")) {
		cleaned = cleaned.substring(2);
	}
	
	// If it has 11 digits and starts with '0', strip '0'
	if (cleaned.length === 11 && cleaned.startsWith("0")) {
		cleaned = cleaned.substring(1);
	}
	
	return cleaned;
};

module.exports = sanitizePhone;
