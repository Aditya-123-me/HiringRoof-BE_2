const userModel = require("../models/user.model"); // Importing the user model

async function getProfileImages(applicantIds) {
    try {
        // Find users by applicantIds and fetch their profile images
        const users = await userModel.find({ _id: { $in: applicantIds } }).select('profileImage').limit(4);

        // Extract profile images from users
        const profileImages = users.map(user => user.profileImage);

        return profileImages;
    } catch (error) {
        console.error("Error fetching profile images:", error);
        throw error;
    }
}

module.exports = getProfileImages;
