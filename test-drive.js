const { imageUpload, deleteFromFirebase } = require("./app/util/googleDrive.util");

async function runTest() {
	console.log("=========================================");
	console.log("Starting Google Drive Upload & Delete Test...");
	console.log("=========================================");

	const dummyFile = {
		buffer: Buffer.from("Hello, this is a test file for Hiring Roof Google Drive integration!"),
		originalname: "test-upload.txt",
		mimetype: "text/plain",
	};

	try {
		console.log("1. Uploading test file to Google Drive...");
		const fileName = `test_upload_${Date.now()}`;
		const url = await imageUpload(dummyFile, fileName, "temp");

		console.log("\n[SUCCESS] File uploaded successfully!");
		console.log("Generated URL:", url);
		console.log("\n👉 ACTION REQUIRED:");
		console.log("1. Go to your Google Drive 'Hiring-roof' folder.");
		console.log(`2. Verify that a file named '${fileName}.txt' is there.`);
		console.log("\nWaiting 15 seconds so you can check before we auto-delete the file...");

		await new Promise((resolve) => setTimeout(resolve, 15000));

		console.log("\n2. Deleting test file from Google Drive...");
		const deleted = await deleteFromFirebase(url);
		if (deleted) {
			console.log("[SUCCESS] File deleted successfully from Google Drive!");
		} else {
			console.log("[ERROR] Failed to delete the file.");
		}
	} catch (error) {
		console.error("\n[FAILURE] Test encountered an error:", error);
	}
	console.log("=========================================");
}

runTest();
