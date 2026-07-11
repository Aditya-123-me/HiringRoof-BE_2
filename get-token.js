const fs = require("fs");
const path = require("path");
const http = require("http");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(__dirname, "oauth-credentials.json");

if (!fs.existsSync(CREDENTIALS_PATH)) {
	console.error("\n[ERROR] oauth-credentials.json not found in the project root!");
	console.error("Please place the downloaded credentials JSON in the root folder and rename it to 'oauth-credentials.json'.\n");
	process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret, redirect_uris } = credentials.web;

const oauth2Client = new google.auth.OAuth2(
	client_id,
	client_secret,
	redirect_uris[0]
);

const scopes = [
	"https://www.googleapis.com/auth/drive"
];

const authUrl = oauth2Client.generateAuthUrl({
	access_type: "offline",
	scope: scopes,
	prompt: "consent" // Force getting a refresh token
});

console.log("\n=========================================");
console.log("Hiring Roof OAuth2 Token Generator");
console.log("=========================================");
console.log("1. Open the following URL in your browser:\n");
console.log(authUrl);
console.log("\n2. Sign in with your Gmail account and grant permission.");
console.log("   (If it says 'Google hasn't verified this app', click 'Advanced' -> 'Go to Hiring Roof Uploader (unsafe)').");
console.log("=========================================\n");

// Start a local HTTP server to receive the authorization code
const server = http.createServer(async (req, res) => {
	if (req.url.startsWith("/oauth2callback")) {
		const urlParams = new URL(req.url, `http://${req.headers.host}`);
		const code = urlParams.searchParams.get("code");

		if (code) {
			try {
				const { tokens } = await oauth2Client.getToken(code);
				console.log("\n[SUCCESS] Successfully authenticated!");
				console.log("\nHere is your REFRESH TOKEN (Save this!):\n");
				console.log(tokens.refresh_token);
				console.log("\n=========================================");
				
				// Append refresh token, client ID and secret to .env file
				let envContent = fs.readFileSync(".env", "utf8");
				
				// Remove existing ones if any, and clean up formatting
				envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*/g, "");
				envContent = envContent.replace(/GOOGLE_CLIENT_SECRET=.*/g, "");
				envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, "");
				
				envContent += `\nGOOGLE_CLIENT_ID=${client_id}`;
				envContent += `\nGOOGLE_CLIENT_SECRET=${client_secret}`;
				envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
				
				fs.writeFileSync(".env", envContent.trim() + "\n");
				console.log("[UPDATED] Successfully added OAuth credentials to your .env file!");
				console.log("=========================================\n");

				res.writeHead(200, { "Content-Type": "text/html" });
				res.end("<h1>Success!</h1><p>You can close this tab now and check your terminal.</p>");
			} catch (error) {
				console.error("Error retrieving access token:", error);
				res.writeHead(500, { "Content-Type": "text/html" });
				res.end("<h1>Error</h1><p>Failed to retrieve access token.</p>");
			} finally {
				server.close();
				process.exit(0);
			}
		}
	}
});

server.listen(3000, () => {
	console.log("Waiting for authorization redirect on http://localhost:3000...");
});
