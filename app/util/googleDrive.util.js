const { google } = require("googleapis");
const stream = require("stream");
const {
	GOOGLE_DRIVE_FOLDER_ID,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_REFRESH_TOKEN,
} = require("../config/config");

// Initialize Google Auth using OAuth2 Client with Refresh Token
const oauth2Client = new google.auth.OAuth2(
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	"http://localhost:3000/oauth2callback"
);

oauth2Client.setCredentials({
	refresh_token: GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

/**
 * Uploads a file to Google Drive
 * @param {Object} imageData Multer file object
 * @param {string} name Base filename (without extension)
 * @param {string} folderName Unused here (kept for compatibility with Firebase signature)
 * @returns {Promise<string>} Public download URL
 */
const imageUpload = async (imageData, name, folderName) => {
	try {
		// 1. Create a readable stream from the buffer
		const bufferStream = new stream.PassThrough();
		bufferStream.end(imageData.buffer);

		const extension = imageData.originalname.split(".").pop();
		const finalFileName = `${name}.${extension}`;

		// 2. Upload file to specific Google Drive Folder
		const fileMetadata = {
			name: finalFileName,
			parents: [GOOGLE_DRIVE_FOLDER_ID],
		};

		const media = {
			mimeType: imageData.mimetype,
			body: bufferStream,
		};

		const response = await drive.files.create({
			requestBody: fileMetadata,
			media: media,
			fields: "id, webContentLink",
		});

		const fileId = response.data.id;

		// 3. Make file publicly readable so it can be accessed via URL
		await drive.permissions.create({
			fileId: fileId,
			requestBody: {
				role: "reader",
				type: "anyone",
			},
		});

		// Return direct download/view link
		return `https://drive.google.com/uc?export=download&id=${fileId}`;
	} catch (error) {
		console.error("Error uploading to Google Drive:", error);
		throw error;
	}
};

/**
 * Deletes a file from Google Drive
 * @param {string} url Public file URL
 * @returns {Promise<boolean>} Success status
 */
const deleteFromFirebase = async (url) => {
	if (!url) return true;

	// Do not delete static images/avatars
	if (url.includes("Avtar.png") || url.includes("Logo.png")) {
		return true;
	}

	// If it is not a Google Drive URL, skip deletion and return true
	if (!url.includes("drive.google.com")) {
		return true;
	}

	try {
		const match = url.match(/[?&]id=([^&#]+)/);
		const fileId = match ? match[1] : null;
		if (!fileId) return true;

		await drive.files.delete({ fileId });
		return true;
	} catch (error) {
		console.error("Error deleting from Google Drive:", error);
		// Return true to avoid blocking controller operations if deletion fails
		return true;
	}
};

module.exports = { imageUpload, deleteFromFirebase };
