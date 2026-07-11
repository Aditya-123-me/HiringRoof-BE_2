const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(__dirname, "oauth-credentials.json");

if (!fs.existsSync(CREDENTIALS_PATH)) {
	console.error("oauth-credentials.json not found!");
	process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret, redirect_uris } = credentials.web;

const oauth2Client = new google.auth.OAuth2(
	client_id,
	client_secret,
	redirect_uris[0]
);

const code = process.argv[2];

if (!code) {
	console.error("Please provide the authorization code!");
	process.exit(1);
}

oauth2Client.getToken(code)
	.then(({ tokens }) => {
		console.log("\n=========================================");
		console.log("[SUCCESS] Refresh Token retrieved:\n", tokens.refresh_token);
		console.log("=========================================");
		
		let envContent = fs.readFileSync(".env", "utf8");
		envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*/g, "");
		envContent = envContent.replace(/GOOGLE_CLIENT_SECRET=.*/g, "");
		envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, "");
		
		envContent += `\nGOOGLE_CLIENT_ID=${client_id}`;
		envContent += `\nGOOGLE_CLIENT_SECRET=${client_secret}`;
		envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
		
		fs.writeFileSync(".env", envContent.trim() + "\n");
		console.log("\nSaved to .env!");
	})
	.catch(err => {
		console.error("\n[ERROR] Failed to exchange code:", err.message);
	});
