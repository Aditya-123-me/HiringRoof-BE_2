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


const createMeetLink = async (details) => {
	try {
		// Convert Date (YYYY-MM-DD) and Time (12-hour format string, e.g. "10:00 AM") to ISO DateTime format
		const [timeStr, modifier] = details.time.split(" ");
		let [hours, minutes] = timeStr.split(":");
		if (modifier === "PM" && hours !== "12") hours = parseInt(hours, 10) + 12;
		if (modifier === "AM" && hours === "12") hours = "00";

		const startIso = `${details.date}T${hours.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
		
		// End date is 1 hour later
		const endDateTime = new Date(new Date(startIso).getTime() + 60 * 60 * 1000);

		const event = {
			summary: `${details.jobTitle} - Interview with ${details.candidateName}`,
			description: `Interview for ${details.jobTitle} at ${details.companyName}`,
			start: {
				dateTime: new Date(startIso).toISOString(),
				timeZone: "Asia/Kolkata",
			},
			end: {
				dateTime: endDateTime.toISOString(),
				timeZone: "Asia/Kolkata",
			},
			attendees: [
				{ email: details.candidateEmail }
			],
			conferenceData: {
				createRequest: {
					requestId: `interview-${Date.now()}`,
					conferenceSolutionKey: { type: "hangoutsMeet" }
				}
			}
		};

		const response = await calendar.events.insert({
			calendarId: "primary",
			resource: event,
			conferenceDataVersion: 1, // Crucial to generate Google Meet link
		});

		return response.data.hangoutLink; // This is the Google Meet link
	} catch (error) {
		console.error("Failed to generate Google Calendar Event:", error);
		throw error;
	}
};

module.exports = { createMeetLink };