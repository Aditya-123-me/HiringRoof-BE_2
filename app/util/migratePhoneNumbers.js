const User = require("../models/user.model");
const JobApplication = require("../models/jobApplication.model");
const sanitizePhone = require("./sanitizePhone");

const migratePhoneNumbers = async () => {
	try {
		console.log("[migratePhoneNumbers] Starting database phone number migration and duplicate merge...");
		const users = await User.find({
			$or: [
				{ phone: { $regex: /[\s\-\(\)\+]/ } },
				{ $expr: { $gt: [{ $strLenCP: "$phone" }, 10] } }
			]
		});

		let cleanedCount = 0;
		let mergedCount = 0;

		for (const user of users) {
			const cleaned = sanitizePhone(user.phone);
			if (cleaned && cleaned !== user.phone) {
				// Check if another user with the cleaned phone already exists
				const existing = await User.findOne({ phone: cleaned });
				if (existing && existing._id.toString() !== user._id.toString()) {
					console.log(`[migratePhoneNumbers] Merging user ${user._id} (${user.phone}) into existing user ${existing._id} (${existing.phone})`);
					
					// Move job applications to the existing user
					await JobApplication.updateMany(
						{ applicantId: user._id },
						{ $set: { applicantId: existing._id } }
					);

					// Copy profile details from the bulk-uploaded user to the logged-in user
					const userData = user.toObject();
					delete userData._id;
					delete userData.phone;
					delete userData.otp;
					delete userData.createdAt;
					delete userData.updatedAt;

					// Merge details
					await User.findByIdAndUpdate(existing._id, { $set: userData });

					// Delete the duplicate bulk user that had the non-sanitized phone
					await User.deleteOne({ _id: user._id });
					mergedCount++;
				} else {
					// No duplicate exists: just clean the phone number on this user
					user.phone = cleaned;
					await user.save();
					cleanedCount++;
				}
			}
		}

		console.log(`[migratePhoneNumbers] Completed. Cleaned: ${cleanedCount}, Merged: ${mergedCount}`);
	} catch (error) {
		console.error("[migratePhoneNumbers] Migration failed with error:", error);
	}
};

module.exports = migratePhoneNumbers;
