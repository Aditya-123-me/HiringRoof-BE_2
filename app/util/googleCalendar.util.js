const { google } = require("googleapis");
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = require("../config/config");

const oauth2Client = new google.auth.OAuth2(
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	"http://localhost:3000/oauth2callback"
);

oauth2Client.setCredentials({
	refresh_token: GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

/**
 * Helper to convert Date (YYYY-MM-DD) and 12-hour Time (e.g., "10:00 AM" or "02:30 PM")
 * to a single ISO datetime string in Asia/Kolkata timezone.
 */
function toIsoString(dateStr, timeStr) {
	if (!dateStr || !timeStr) return null;

	try {
		// e.g., timeStr = "10:00 AM" or "02:30 PM"
		const [timeVal, modifier] = timeStr.trim().split(/\s+/);
		if (!timeVal || !modifier) return null;

		let [hours, minutes] = timeVal.split(":");
		hours = parseInt(hours, 10);
		minutes = parseInt(minutes, 10);

		if (modifier.toUpperCase() === "PM" && hours !== 12) {
			hours += 12;
		}
		if (modifier.toUpperCase() === "AM" && hours === 12) {
			hours = 0;
		}

		// Ensure 2 digit formatting
		const h = hours.toString().padStart(2, "0");
		const m = minutes.toString().padStart(2, "0");

		// dateStr is in YYYY-MM-DD format
		// Create date representation in local Indian Standard Time (+05:30)
		return `${dateStr}T${h}:${m}:00+05:30`;
	} catch (e) {
		console.error("Error parsing date/time parameters:", e);
		return null;
	}
}

/**
 * Creates a Google Calendar Event and generates a Google Meet link.
 * @param {Object} details { candidateEmail, candidateName, companyName, jobTitle, date, time }
 * @returns {Promise<string>} Google Meet Link (hangoutLink)
 */
const createMeetLink = async (details) => {
	try {
		const startIso = toIsoString(details.date, details.time);
		if (!startIso) {
			throw new Error("Invalid date or time format provided to createMeetLink");
		}

		// Set end time to 1 hour after start
		const startDate = new Date(startIso);
		const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

		const event = {
			summary: `${details.jobTitle} - Interview with ${details.candidateName}`,
			description: `Interview for the position of ${details.jobTitle} at ${details.companyName}.`,
			start: {
				dateTime: startDate.toISOString(),
				timeZone: "Asia/Kolkata",
			},
			end: {
				dateTime: endDate.toISOString(),
				timeZone: "Asia/Kolkata",
			},
			attendees: details.candidateEmail ? [{ email: details.candidateEmail }] : [],
			conferenceData: {
				createRequest: {
					requestId: `interview-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
					conferenceSolutionKey: {
						type: "hangoutsMeet",
					},
				},
			},
		};

		const response = await calendar.events.insert({
			calendarId: "primary",
			resource: event,
			conferenceDataVersion: 1, // Crucial to request Meet generation
		});

		return response.data.hangoutLink || "";
	} catch (error) {
		console.error("Failed to generate Google Calendar Meet link:", error);
		// Return empty string instead of crashing
		return "";
	}
};

module.exports = { createMeetLink };
