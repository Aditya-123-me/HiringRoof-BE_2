
const normalizePhone = (phoneStr) => {
	if (!phoneStr) return "";
	let cleaned = String(phoneStr).replace(/\D/g, ""); // Keep only digits
	if (cleaned.length === 12 && cleaned.startsWith("91")) cleaned = cleaned.slice(2);
	if (cleaned.length === 11 && cleaned.startsWith("0")) cleaned = cleaned.slice(1);
	return cleaned;
};


const normalizeSkills = (skillsInput) => {
	if (!skillsInput) return [];
	if (Array.isArray(skillsInput)) return skillsInput.map(s => String(s).trim()).filter(Boolean);
	return String(skillsInput)
		.split(/[;,]/)
		.map(s => s.trim())
		.filter(Boolean);
};


/**
 * Parses and normalizes a string list of items into an array of objects
 * Handles bracket-wrapped strings, colon delimiters, comma-separated lists, and inline dates.
 */
const parseItemList = (input, isEducation = false) => {
	if (!input) return [];
	if (Array.isArray(input)) return input;

	let text = String(input).trim();
	
	// 1. Check if it is a JSON array or custom bracket string
	if (text.startsWith("[") && text.endsWith("]")) {
		try {
			const parsed = JSON.parse(text);
			if (Array.isArray(parsed)) return parsed;
		} catch (e) {
			// Not a valid JSON array, just custom brackets. Strip them.
			text = text.substring(1, text.length - 1).trim();
		}
	}

	// 2. Split items by commas, semicolons, or newlines
	const parts = text.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
	const results = [];
	
	for (const part of parts) {
		// Helper to extract dates in parentheses e.g. "(2016-2018)"
		const extractDates = (str) => {
			const dateMatch = str.match(/\(([^)]+)\)/);
			let cleanStr = str;
			let startTime = "";
			let endTime = "";
			if (dateMatch) {
				cleanStr = str.replace(dateMatch[0], "").trim();
				const dateParts = dateMatch[1].split(/[-–to]+/i).map(d => d.trim());
				startTime = dateParts[0] || "";
				endTime = dateParts[1] || "";
			}
			return { cleanStr, startTime, endTime };
		};

		if (part.includes(":")) {
			// New item (e.g. "School Name: Description")
			const colonIndex = part.indexOf(":");
			const nameOrTitle = part.substring(0, colonIndex).trim();
			const rest = part.substring(colonIndex + 1).trim();
			
			const { cleanStr, startTime, endTime } = extractDates(rest);
			
			const item = isEducation
				? { name: nameOrTitle, desc: cleanStr, startTime, endTime }
				: { projectName: nameOrTitle, desc: cleanStr, startTime, endTime };
				
			results.push(item);
		} else {
			// Continuation of description for the previous item (e.g. comma in description)
			if (results.length > 0) {
				const lastItem = results[results.length - 1];
				const { cleanStr, startTime, endTime } = extractDates(part);
				
				lastItem.desc = lastItem.desc ? `${lastItem.desc}, ${cleanStr}` : cleanStr;
				
				if (startTime) lastItem.startTime = startTime;
				if (endTime) lastItem.endTime = endTime;
			} else {
				// Fallback if no previous item exists
				const { cleanStr, startTime, endTime } = extractDates(part);
				const item = isEducation
					? { name: cleanStr, desc: "", startTime, endTime }
					: { projectName: cleanStr, desc: "", startTime, endTime };
				results.push(item);
			}
		}
	}
	
	return results;
};

const normalizeEducation = (educationInput) => {
	return parseItemList(educationInput, true);
};

const normalizeProjects = (projectsInput) => {
	return parseItemList(projectsInput, false);
};

const normalizeHeaders = (headers) => {
	if (!headers || !Array.isArray(headers)) return [];
	
	const mapping = {
		name: "name",
		phone: "phone",
		mobilenumber: "phone",
		phonenumber: "phone",
		email: "email",
		gender: "gender",
		dob: "dob",
		dateofbirth: "dob",
		skills: "skills",
		experience: "experience",
		location: "location",
		address: "address",
		resume: "resume",
		resumeurl: "resume",
		letter: "letter",
		coverletter: "letter",
		alternativephone: "alternativePhone",
		alternatephone: "alternativePhone",
		alternativephone2: "alternativePhone2",
		alternatephone2: "alternativePhone2",
		profession: "profession",
		currentpay: "currentPay",
		currentctc: "currentPay",
		ctc: "currentPay",
		expectedpay: "expectationPay",
		expectedctc: "expectationPay",
		ectc: "expectationPay",
		projects: "projects",
		project: "projects",
		education: "education",
		about: "about",
		entrydate: "entryDate",
		immediatejoiner: "immediateJoiner",
		lastqualification: "lastQualification",
		passoutyear: "passoutYear",
		withoutcontactresume: "withoutContactResume",
		response: "response",
		wfo: "wfo",
		interested: "interested",
		callby: "callBy",
		feedback: "feedback",
		source: "source"
	};

	return headers.map(header => {
		if (!header) return "";
		const clean = String(header).trim().toLowerCase().replace(/[\s\-\_]+/g, "");
		return mapping[clean] || header;
	});
};

module.exports = {
	normalizePhone,
	normalizeSkills,
	normalizeEducation,
	normalizeProjects,
	normalizeHeaders
};
