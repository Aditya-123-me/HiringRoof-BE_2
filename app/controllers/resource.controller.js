const resourceController = {};
const Resource = require("../models/resource.model");

resourceController.getResourcesByPoster = async (req, res) => {
	const posterId = req.user._id; // Fix destructuring error

	try {
		const resources = await Resource.find({ posterId })
			.populate({
				path: "jobId",
			})
			.populate({
				path: "applicationData.candidateId",
				model: "users", // Ensure this matches your Mongoose model name
			});

		if (!resources.length) {
			return res.status(404).json({ status: false, msg: "No resources found for this posterId" });
		}

		return res.json({
			status: true,
			resources,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};


resourceController.getAllResources = async (req, res) => {
	try {
		const resources = await Resource.find({}).populate({
			path: "jobApplicationId",
			populate: { path: "jobId" }, // Populate job details inside jobApplication
		});

		if (!resources.length) {
			return res.status(404).json({ status: false, msg: "No resources found" });
		}

		return res.json({
			status: true,
			resources,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = resourceController;
