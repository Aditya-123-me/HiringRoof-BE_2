const jobApplicationModel = require("../models/jobApplication.model");
const Save = require("../models/save.model");

const save = {};

save.create = async (req, res) => {
	try {
		const jobId = req.params._id;
		const userId = req.user._id.toString();

		const findUser = await Save.find({ userId });

		if (findUser.length === 0) {
			const data = await Save.create({ userId, jobId });
			const allData = await Save.findById({ _id: data._id }).populate("jobId").populate({
				path: "userId",
				select: "name email phone profileImage userType",
			});
			return res.status(200).send({ status: true, msg: "Job saved successfully !!", save: "save", updatedData: allData });
		}

		const savedObj = findUser[0];
		const updatedSavedObj = {};
		updatedSavedObj.userId = savedObj.userId;

		const jobIdArray = savedObj.jobId.map((id) => id.toString());

		let type;
		if (jobIdArray.includes(jobId)) {
			updatedSavedObj.jobId = jobIdArray.filter((item) => item !== jobId);
			type = false;
		} else {
			jobIdArray.push(jobId);
			updatedSavedObj.jobId = jobIdArray;
			type = true;
		}

		const updatedData = await Save.findByIdAndUpdate({ _id: savedObj._id }, { $set: updatedSavedObj }, { new: true })
			.populate("jobId")
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			});

		return res.status(200).send({ status: true, msg: `Job ${type ? "saved" : "unsaved"} !!`, save: type, updatedData });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

save.get = async (req, res) => {
	try {
		const savedJob = await Save.find({ userId: req.user._id })
			.populate({
				path: "jobId",
				populate: [
					{
						path: "userId",
						select: "name email phone profileImage userType",
					},
				],
			})
			.lean();

		const savedJobCounts = await Save.countDocuments({ userId: req.user._id });
		const apply = await jobApplicationModel.find({ applicantId: req.user._id });

		const data = [];
		if (savedJob.length === 0)
			return res.status(200).send({
				status: true,
				msg: "No Saved Job found!!",
				savedJobCount: savedJobCounts,
				data,
			});

		savedJob[0].jobId.forEach((e) => {
			if (!e) return;
			let isSaved = true;
			let isApplied = false;

			if (apply.length > 0) {
				isApplied = apply.some((obj) => obj.jobId.toString() === e._id.toString());
			}

			data.push({
				...e,
				isSaved,
				isApplied,
			});
		});

		return res.status(200).send({
			status: true,
			msg: "All Saved Job fetch successfully!!",
			savedJobCount: savedJobCounts,
			data,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

module.exports = save;
