const adminUserModel = require("../models/adminUser.model");
const Job = require("../models/job.model");
const jobApplicationModel = require("../models/jobApplication.model");
const JobApplication = require("../models/jobApplication.model");
const Save = require("../models/save.model");
const userModel = require("../models/user.model");
const createNotification = require("../util/createNotification");
const { imageUpload } = require("../util/googleDrive.util");
const extractSkillSub = require("../util/functions");
const User = require("../models/user.model");
const moment = require("moment");
const Resource = require("../models/resource.model");

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const jobController = {};

jobController.post = async (req, res, io) => {
	try {
		const { _id } = req?.query;

		if (req.user.email === "")
			return res.status(404).send({ status: false, job: {}, msg: "Please add your email in your profile !!" });
		if (req.user.name === "")
			return res.status(404).send({ status: false, job: {}, msg: "Please add your name in your profile!!" });

		const ownUser = await userModel.findOne({ _id: req.user._id });

		const bodyData = {};
		bodyData.userId = req.user._id;
		bodyData.jobTittle = req.body.jobTittle;
		bodyData.jobType = req.body.jobType;
		bodyData.workType = req.body.workType;
		bodyData.timePeriod = req.body.timePeriod;
		bodyData.note = req.body.note;
		bodyData.pay = req.body.pay;
		bodyData.payType = req.body.payType;
		bodyData.location = req.body.location;
		bodyData.companyName = req.body.companyName;
		if (req.body.stream) bodyData.stream = JSON.parse(req.body.stream);
		if (req.body.experience) bodyData.experience = req.body.experience;
		if (req.body.availability) bodyData.availability = req.body.availability;
		if (req.body.serviceType) bodyData.serviceType = req.body.serviceType;
		if (req.body.vacancies) bodyData.vacancies = req.body.vacancies;
		if (req.body.companyName) {
			let shortName = "";
			const cn = req.body.companyName.split(" ");
			if (cn.length > 1) cn.map((data) => (shortName += data[0].toUpperCase()));
			else shortName = cn[0].slice(0, 3).toUpperCase();
			bodyData.companyShortName = shortName;
		}
		if (req.body.addOn) bodyData.addOn = JSON.parse(req.body.addOn);
		if (req.body.skillDetails) {
			const extractData = extractSkillSub(JSON.parse(req.body.skillDetails));
			bodyData.skillDetails = extractData.mergedSkillDetails;
			bodyData.skillSubCategories = extractData.skillSubCategories;
			bodyData.skills = extractData.skills;
		}

		// Tag added Start
		const regex = /#(\w+)/g;
		const tags = [];
		let match;
		while ((match = regex.exec(bodyData.note)) !== null) tags.push(match[1]);
		bodyData.tags = tags;
		// Tag added End

		if (req.body.pay === "") bodyData.pay = 0;

		if (req.file) {
			const imgUrl = await imageUpload(req.file, `${req.user._id}_${new Date().getTime()}_CompanyLogo`, "companyLogo");
			if (!imgUrl) return res.status(404).json({ status: false, msg: `Image upload failed, please try again !!` });
			bodyData.companyLogo = imgUrl;
			ownUser.companyLogo = imgUrl;
			// await userModel.findByIdAndUpdate(req.user._id, { $set: { companyLogo: imgUrl } }, { new: true });
		} else {
			bodyData.companyLogo = req.user.companyLogo;
		}

		ownUser.totalJobs = ownUser.totalJobs + 1;
		await ownUser.save();

		let job;

		if (_id) {
			job = await Job.findById({ _id });
			if (!job) return res.status(404).send({ status: false, msg: "Invalid id or job not available !!" });
			job = await Job.findByIdAndUpdate({ _id }, { $set: bodyData }, { new: true });
		} else job = await Job.create(bodyData);

		const jobData = await Job.findById(job._id).populate("userId");

		if (!_id) {
			const users = await userModel
				.find({
					skillSubCategories: { $in: jobData.skillSubCategories.map((tag) => new RegExp(tag, "i")) },
					skills: { $in: jobData.skills.map((tag) => new RegExp(tag, "i")) },
					blocked_status: false,
				})
				.select("name email phone profileImage userType videoUrl skills skillSubCategories experience");

			// const users = await userModel
			// 	.find({ skills: { $in: jobData.skills.map((tag) => new RegExp(tag, "i")) } })
			// 	.select("name email phone profileImage userType videoUrl skills experience");

			await Promise.all(
				users.map(async (user) => {
					const data = await createNotification({
						senderId: jobData.userId._id,
						receiverId: user._id,
						title: `${jobData.jobTittle}`,
						desc: `${jobData.jobTittle} posted ${jobData.skills.join(", ")} related job`,
						logo: jobData.companyLogo,
					});
					io.emit(`notifications_${data.receiverId._id}`, data);
				})
			);

			const data = await createNotification({
				senderId: jobData.userId._id,
				receiverId: jobData.userId._id,
				title: `Candidate suggestion according to ${jobData.jobTittle} job skills`,
				desc: `${users[0]?.name}, ${users[1]?.name}, ${users[2]?.name} have knowledge in ${jobData.skills.join(", ")} skills`,
				logo: jobData.companyLogo,
				keyName: "users",
				extraData: users,
			});
			io.emit(`notifications_${data.receiverId._id}`, data);
		}

		return res.status(200).json({ status: true, msg: `Job ${_id ? "updated" : "created"} successfully !!`, job: jobData });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.getAddOnJobs = async (req, res) => {
	try {
		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);

		const addons = ["Urgent", "Premium", "Immediate", "Contact Deal"];
		let filters = {};
		filters.isActive = true;
		filters.blocked_status = false;
		const regexArray = addons.map((data) => new RegExp(data, "i"));
		filters.serviceType = { $in: regexArray };

		const jobsData = await Job.find(filters)
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const jobCount = await Job.countDocuments(filters);

		let jobs = [];

		if (req.user) {
			const saveJobs = await Save.findOne({ userId: req.user._id });
			const apply = await JobApplication.find({ applicantId: req.user._id });

			jobsData.map((e) => {
				let isSaved = false;
				let isApplied = false;

				if (saveJobs) isSaved = saveJobs.jobId.includes(e._id);
				if (apply.length > 0) isApplied = apply.some((obj) => obj.jobId.toString() === e._id.toString());

				jobs.push({
					...e,
					isSaved,
					isApplied,
				});
			});
		} else jobs = [...jobsData];

		return res.json({
			status: true,
			msg: `Job fetch successfully !!`,
			jobCount,
			pageCount: parseInt(Math.ceil(jobCount / limit)),
			currentPage: parseInt(page),
			data: jobs,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.getJobs = async (req, res) => {
	try {
		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);

		let filters = {};
		filters.isActive = true;
		filters.blocked_status = false;
		if (req.query.serviceType) filters.serviceType = req.query.serviceType;
		if (req.query.jobType) filters.jobType = req.query.jobType;
		if (req.query.workType) filters.workType = req.query.workType;
		if (req.query.availability) filters.availability = req.query.availability;
		if (req.query.timePeriod) filters.timePeriod = req.query.timePeriod;
		if (req.query.payType) filters.payType = req.query.payType;
		if (req.query.pay) filters.pay = { $gt: req.query.pay };
		const date = new Date(req.query.dateOfPosting);
		if (req.query.dateOfPosting) filters.createdAt = { $gt: date.toISOString() };
		if (req.query.jobTittle) filters.jobTittle = { $regex: req.query.jobTittle, $options: "i" };
		if (req.query.stream) filters.stream = { $regex: new RegExp(req.query.stream, "i") };
		if (req.query.location) filters.location = { $regex: new RegExp(req.query.location, "i") };
		if (req.query.tags !== "[]" && req.query.tags) {
			const regexArray = JSON.parse(req.query.tags).map((tag) => new RegExp(tag, "i"));
			filters.tags = { $in: regexArray };
		}

		const jobsData = await Job.find(filters)
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const jobCount = await Job.countDocuments(filters);

		return res.json({
			status: true,
			msg: `Job fetch successfully !!`,
			jobCount,
			pageCount: parseInt(Math.ceil(jobCount / limit)),
			currentPage: parseInt(page),
			jobs: jobsData,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.getJobsAuth = async (req, res) => {
	try {
		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);

		let filters = {};
		filters.isActive = true;
		filters.blocked_status = false;
		if (req.query.serviceType) filters.serviceType = req.query.serviceType;
		if (req.query.jobType) filters.jobType = req.query.jobType;
		if (req.query.workType) filters.workType = req.query.workType;
		if (req.query.availability) filters.availability = req.query.availability;
		if (req.query.timePeriod) filters.timePeriod = req.query.timePeriod;
		if (req.query.payType) filters.payType = req.query.payType;
		if (req.query.pay) filters.pay = { $gt: req.query.pay };
		const date = new Date(req.query.dateOfPosting);
		if (req.query.dateOfPosting) filters.createdAt = { $gt: date.toISOString() };
		if (req.query.jobTittle) filters.jobTittle = { $regex: req.query.jobTittle, $options: "i" };
		if (req.query.stream) filters.stream = { $regex: new RegExp(req.query.stream, "i") };
		if (req.query.location) filters.location = { $regex: new RegExp(req.query.location, "i") };
		if (req.query.tags !== "[]" && req.query.tags) {
			const regexArray = JSON.parse(req.query.tags).map((tag) => new RegExp(tag, "i"));
			filters.tags = { $in: regexArray };
		}

		const jobsData = await Job.find(filters)
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const jobCount = await Job.countDocuments(filters);

		const jobs = [];

		const saveJobs = await Save.findOne({ userId: req.user._id });
		const apply = await JobApplication.find({ applicantId: req.user._id });

		jobsData.map((e) => {
			let isSaved = false;
			let isApplied = false;

			if (saveJobs) isSaved = saveJobs.jobId.includes(e._id);
			if (apply.length > 0) isApplied = apply.some((obj) => obj.jobId.toString() === e._id.toString());

			jobs.push({
				...e,
				isSaved,
				isApplied,
			});
		});

		return res.json({
			status: true,
			msg: `Job fetch successfully !!`,
			jobCount,
			pageCount: parseInt(Math.ceil(jobCount / limit)),
			currentPage: parseInt(page),
			jobs: jobs,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.getOneJob = async (req, res) => {
	try {
		const jobId = req.params.id;

		let job = {};
		const jobData = await Job.findOne({ _id: jobId })
			.populate({
				path: "userId",
				select: "-otp -currentPay -expectationPay -videoUrl -experience -resume -skills",
			})
			.lean();

		job = jobData;

		if (req.user) {
			const saveJobs = await Save.findOne({ userId: req.user._id });
			let isSaved = saveJobs.jobId.includes(e._id);
			console.log(isSaved, "is saved");
		}

		return res.json({
			status: true,
			msg: `Job fetch successfully !!`,
			data: jobData,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.search = async (req, res) => {
	try {
		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);
		const type = req.query.type ? req.query.type : "jobTitle";

		const { query } = req.params;

		const tittle = { $regex: query, $options: "i" };
		const skillSubCategories = { $regex: query, $options: "i" };
		const skills = { $regex: query, $options: "i" };
		const workType = { $regex: query, $options: "i" };
		const companyShortName = { $regex: query, $options: "i" };

		let data = [];
		let count = 0;

		const tittleData = await Job.find({ tittle })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const tittleCount = await Job.countDocuments({ tittle });

		const skillSubCategoriesData = await Job.find({ skillSubCategories })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const skillSubCategoriesCount = await Job.countDocuments({ skillSubCategories });

		const skillsData = await Job.find({ skills })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const skillsCount = await Job.countDocuments({ skills });

		const workTypeData = await Job.find({ workType })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const workTypeCount = await Job.countDocuments({ workType });

		const companyShortNameData = await Job.find({ companyShortName })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();
		const companyShortNameCount = await Job.countDocuments({ companyShortName });

		if (tittleData.length > 0 && type === "jobTitle") {
			data.push(...tittleData);
			count += tittleCount;
		}
		if (skillSubCategoriesData.length > 0 && type === "skills") {
			data.push(...skillSubCategoriesData);
			count += skillSubCategoriesCount;
		}
		if (skillsData.length > 0 && type === "skills") {
			data.push(...skillsData);
			count += skillsCount;
		}
		if (workTypeData.length > 0 && type === "workType") {
			data.push(...workTypeData);
			count += workTypeCount;
		}
		if (companyShortNameData.length > 0 && type === "companyShortName") {
			data.push(...companyShortNameData);
			count += companyShortNameCount;
		}

		console.log(tittleCount, skillSubCategoriesCount, skillsCount, workTypeCount, companyShortNameCount);

		data = data.filter((job) => !job.blocked_status);

		const jobs = [];
		if (req.user) {
			const saveJobs = await Save.findOne({ userId: req.user._id });
			const apply = await JobApplication.find({ applicantId: req.user._id });

			data.map((e) => {
				let isSaved = false;
				let isApplied = false;

				if (saveJobs) isSaved = saveJobs.jobId.includes(e._id);
				if (apply.length > 0) isApplied = apply.some((obj) => obj.jobId.toString() === e._id.toString());

				if (!jobs.includes(e._id))
					jobs.push({
						...e,
						isSaved,
						isApplied,
					});
			});
		} else {
			data.map((e) => {
				if (!jobs.includes(e._id)) jobs.push(e);
			});
		}

		return res.json({
			status: true,
			msg: jobs.length === 0 ? `No job found !!` : `Job search result fetch successfully !!`,
			allCount: count,
			pageCount: parseInt(Math.ceil(count / limit)),
			currentPage: parseInt(page),
			jobs: jobs,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.delete = async (req, res) => {
	try {
		const { _id } = req.params;
		const findJob = await Job.findById({ _id });
		if (!findJob) return res.status(404).send({ status: false, msg: "No job found, please check your id !!" });

		const deleteOne = await Job.findByIdAndDelete({ _id }).populate("userId", { name: 1, email: 1, phone: 1 });

		return res.status(200).send({ status: true, msg: "One job deleted !!", data: deleteOne });
	} catch (error) {
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.myJobs = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);

		const jobsData = await Job.find({ userId: req.user._id })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("userId", {
				name: 1,
				email: 1,
				phone: 1,
				profileImage: 1,
			})
			.lean();
		const jobCount = await Job.countDocuments({ userId: req.user._id });

		const jobs = [];

		await Promise.all(
			jobsData.map(async (e, index) => {
				let inProcess = 0;
				let hired = 0;
				let rejected = 0;

				inProcess = await jobApplicationModel.countDocuments({ jobId: e._id, selectedCandidates: null });
				hired = await jobApplicationModel.countDocuments({ jobId: e._id, selectedCandidates: true });
				rejected = await jobApplicationModel.countDocuments({ jobId: e._id, selectedCandidates: false });

				// jobs.push({
				// 	...e,
				// 	inProcess,
				// 	hired,
				// 	rejected,
				// });

				jobs[index] = {
					...e,
					inProcess,
					hired,
					rejected,
				};
			})
		);

		return res.json({
			status: true,
			msg: `My job fetch successfully !!`,
			count: jobCount,
			pageCount: parseInt(Math.ceil(jobCount / limit)),
			currentPage: parseInt(page),
			data: jobs,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.changeActiveState = async (req, res, io) => {
	try {
		const { id } = req.params;

		const job = await Job.findOne({ _id: id });
		if (!job) return res.status(404).send({ status: false, msg: "No job found !!" });

		// if (job.userId.toString() !== req.user._id.toString())
		// 	return res.status(404).send({ status: false, msg: "The application doesn't belong to this user !!" });

		const updatedJob = await Job.findByIdAndUpdate(id, { isActive: false }, { new: true });

		// Find HRs
		const hrModels = await adminUserModel.find({ type: "admin" });

		for (const hr of hrModels) {
			for (const month of hr.jobTarget) {
				for (const jobIdObj of month.jobIds) {
					if (jobIdObj.jobId.toString() === id) {
						jobIdObj.process = "completed";
						await hr.save();
					}
				}
			}
		}

		const data = await createNotification({
			senderId: updatedJob.userId,
			receiverId: updatedJob.userId,
			title: `${updatedJob.jobTittle}`,
			desc: `You closed "${updatedJob.jobTittle}" this job`,
			logo: updatedJob.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		return res.json({
			status: true,
			msg: `Job close successfully !!`,
			data: updatedJob,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.blockUnblockJob = async (req, res) => {
	try {
		const { jobId, block, reason, blockedBy } = req.body;

		// if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
		//     return res.status(400).json({ message: "Invalid Job ID" });
		// }

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ message: "Job not found" });
		}

		if (block) {
			job.blocked_status = true;
			job.blocked = {
				reason: reason || "",
				date: new Date(),
				blockedBy: blockedBy || null, // Assuming you have user authentication and req.user contains the authenticated user's details
			};
		} else {
			job.blocked_status = false;
			job.blocked = {
				reason: "",
				date: null,
				blockedBy: null,
			};
		}

		await job.save();

		return res.status(200).json({ status: true, msg: `Job ${block ? "blocked" : "unblocked"} successfully` });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

jobController.bulkUpload = async (req, res) => {
	const { jobId } = req.body;
	const posterId = req.user._id; // Get posterId from authenticated user

	try {
		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ status: false, msg: "No job found !!" });

		if (!req.file) return res.status(400).json({ message: "No file uploaded" });

		// Read the Excel file from buffer
		const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
		const sheetName = workbook.SheetNames[0];
		const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

		// Extract headers from the first row
		const headers = rawData[0];

		// Extract actual data (starting from the second row)
		const formattedData = rawData.slice(1).map((row) => {
			let obj = {};
			headers.forEach((header, index) => {
				obj[header] = row[index] || "";
			});

			// Format 'entryDate' and 'dob' if they are in Excel serial date format
			if (obj.entryDate) obj.entryDate = moment(XLSX.SSF.parse_date_code(obj.entryDate)).format("YYYY-MM-DD");
			if (obj.dob) obj.dob = moment(XLSX.SSF.parse_date_code(obj.dob)).format("YYYY-MM-DD");

			// Convert 'skills' from comma-separated string to an array
			if (obj.skills) obj.skills = obj.skills.split(",").map((skill) => skill.trim());

			obj.userType = "jobSeeker";
			return obj;
		});

		const appliedUsers = [];
		const applicationData = [];

		for (const candidate of formattedData) {
			const { phone } = candidate;
			if (!phone) continue;

			let user = await User.findOne({ phone });

			if (!user) {
				user = await User.create(candidate);
			}

			// Check if application exists
			let application = await JobApplication.findOne({
				applicantId: user._id,
				jobId,
			});

			if (!application) {
				// Create new job application
				application = await JobApplication.create({
					applicantId: user._id,
					applierId: job.userId,
					jobId,
				});
			}

			// Push application data instead of creating Resource in each loop
			applicationData.push({
				jobApplicationId: application._id,
				candidateId: user._id,
			});

			appliedUsers.push({ userId: user._id, name: user.name, phone: user.phone });
		}

		// Create a single Resource entry at the end
		if (applicationData.length > 0) {
			await Resource.create({
				posterId,
				jobId,
				applicationData,
			});
		}

		return res.json({
			status: true,
			msg: "Bulk job applications processed successfully!",
			appliedUsers,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.singleUpload = async (req, res) => {
	const { jobId, userData } = req.body;
	const posterId = req.user._id; // Get posterId from authenticated user

	try {
		const job = await Job.findById(jobId);
		if (!job) return res.status(404).json({ status: false, msg: "No job found !!" });

		// Find or create user
		let user = await User.findOne({ phone: userData?.phone });

		if (!user) {
			user = await User.create(userData);
		}

		// Check if application exists
		let application = await JobApplication.findOne({
			applicantId: user._id,
			jobId,
		});

		if (!application) {
			// Create new job application
			application = await JobApplication.create({
				applicantId: user._id,
				applierId: posterId,
				jobId,
			});
		}

		// Find the resource with posterId and jobId
		let resource = await Resource.findOne({ posterId, jobId });

		if (resource) {
			// Resource found: push new application data
			resource.applicationData.push({
				jobApplicationId: application._id,
				candidateId: user._id,
			});
			await resource.save();
		} else {
			// Resource not found: create a new one
			resource = await Resource.create({
				posterId,
				jobId,
				applicationData: [
					{
						jobApplicationId: application._id,
						candidateId: user._id,
					},
				],
			});
		}

		return res.json({
			status: true,
			msg: "Job application submitted successfully!",
			user,
			jobApplication: application,
			resource,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

module.exports = jobController;
