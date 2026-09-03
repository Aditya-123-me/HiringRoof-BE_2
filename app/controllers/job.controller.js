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
const { createMeetLink } = require("../util/googleCalendar.util");

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
// const jobModel = require("../models/job.model");
 
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
		if (req.body.stream) {
			try {
				bodyData.stream = typeof req.body.stream === "string" ? JSON.parse(req.body.stream) : req.body.stream;
			} catch (e) {
				bodyData.stream = Array.isArray(req.body.stream) ? req.body.stream : [req.body.stream];
			}
		}

		if (!bodyData.stream || !Array.isArray(bodyData.stream) || bodyData.stream.length === 0) {
			return res.status(400).json({
				status: false,
				job: {},
				msg: "Please select at least one educational stream (Arts, Commerce, or Science)!",
			});
		}

		if (req.body.experience) bodyData.experience = req.body.experience;
		if (req.body.availability) bodyData.availability = req.body.availability;
		if (req.body.serviceType) bodyData.serviceType = req.body.serviceType;
		if (req.body.availability === true || req.body.availability === "true" || req.body.serviceType === "Immediate") {
			bodyData.immediateTagActive = true;
			bodyData.immediateTagExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
		} else {
			bodyData.immediateTagActive = false;
			bodyData.immediateTagExpiresAt = null;
		}
		if (req.body.vacancies) bodyData.vacancies = req.body.vacancies;
		if (req.body.companyName) {
			let shortName = "";
			const cn = req.body.companyName.split(" ").filter(Boolean);
			if (cn.length > 1) cn.map((data) => { if (data) shortName += data[0].toUpperCase() });
			else if (cn.length === 1) shortName = cn[0].slice(0, 3).toUpperCase();
			bodyData.companyShortName = shortName;
		}
		if (req.body.addOn) bodyData.addOn = JSON.parse(req.body.addOn);
		if (req.body.skills) {
			let rawSkillsList = [];
			if (typeof req.body.skills === "string") {
				try {
					const parsed = JSON.parse(req.body.skills);
					if (Array.isArray(parsed)) rawSkillsList = parsed;
					else rawSkillsList = [req.body.skills];
				} catch (e) {
					rawSkillsList = req.body.skills.split(",");
				}
			} else if (Array.isArray(req.body.skills)) {
				rawSkillsList = req.body.skills;
			}

			const parsedSkills = [];
			rawSkillsList.forEach((item) => {
				if (typeof item === "string") {
					item.split(",").forEach((s) => {
						const trimmed = s.trim();
						if (trimmed && !parsedSkills.includes(trimmed)) {
							parsedSkills.push(trimmed);
						}
					});
				}
			});
			bodyData.skills = parsedSkills;
		}

		if (req.body.skillDetails) {
			try {
				const extractData = extractSkillSub(typeof req.body.skillDetails === "string" ? JSON.parse(req.body.skillDetails) : req.body.skillDetails);
				bodyData.skillDetails = extractData.mergedSkillDetails;
				bodyData.skillSubCategories = extractData.skillSubCategories;
				if (!bodyData.skills) bodyData.skills = extractData.skills;
			} catch (e) {
				console.log("Job skill details parsing skipped");
			}
		}

		// Tag added Start
		const regex = /#(\w+)/g;
		const tags = [];
		let match;
		while ((match = regex.exec(bodyData.note)) !== null) tags.push(match[1]);
		bodyData.tags = tags;
		// Tag added End

		if (req.body.pay === "") bodyData.pay = "";

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
			const skillSubCats = (jobData.skillSubCategories || []).map((tag) => new RegExp(tag, "i"));
			const userSkills = (jobData.skills || []).map((tag) => new RegExp(tag, "i"));

			const users = await userModel
				.find({
					$or: [{ skillSubCategories: { $in: skillSubCats } }, { skills: { $in: userSkills } }],
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

			const userNames = users.slice(0, 3).map((u) => u?.name || "Candidate").join(", ");
			const data = await createNotification({
				senderId: jobData.userId._id,
				receiverId: jobData.userId._id,
				title: `Candidate suggestion according to ${jobData.jobTittle} job skills`,
				desc: `${userNames} have knowledge in ${(jobData.skills || []).join(", ")} skills`,
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
		const expireJobsAndServices = require("../util/expireJobsAndServices");
		await expireJobsAndServices();

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
		const expireJobsAndServices = require("../util/expireJobsAndServices");
		await expireJobsAndServices();

		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);

		let filters = {};
		filters.isActive = true;
		filters.blocked_status = false;
		filters.isDeleted = { $ne: true };
		if (req.query.serviceType) filters.serviceType = req.query.serviceType;
		if (req.query.jobType) filters.jobType = req.query.jobType;
		if (req.query.workType) filters.workType = req.query.workType;
		if (req.query.availability) filters.availability = req.query.availability;
		if (req.query.timePeriod) filters.timePeriod = req.query.timePeriod;
		if (req.query.payType) filters.payType = req.query.payType;
		if (req.query.pay) filters.pay = { $regex: req.query.pay, $options: "i" };
		const date = new Date(req.query.dateOfPosting);
		if (req.query.dateOfPosting) filters.createdAt = { $gt: date.toISOString() };
		if (req.query.jobTittle) filters.jobTittle = { $regex: req.query.jobTittle, $options: "i" };
		if (req.query.stream) filters.stream = { $regex: new RegExp(req.query.stream, "i") };
		if (req.query.location) filters.location = { $regex: new RegExp(req.query.location, "i") };
		if (req.query.tags !== "[]" && req.query.tags) {
			const regexArray = JSON.parse(req.query.tags).map((tag) => new RegExp(tag, "i"));
			filters.tags = { $in: regexArray };
		}

		let sortOption = { createdAt: -1 };
		if (req.query.sort === "popular") sortOption = { vacancies: -1, createdAt: -1 };
		else if (req.query.sort === "highest_salary" || req.query.sort === "salary") sortOption = { pay: -1, createdAt: -1 };
		else if (req.query.sort === "most_recent") sortOption = { createdAt: -1 };

		const jobsData = await Job.find(filters)
			.limit(limit)
			.skip(skip)
			.sort(sortOption)
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
		const expireJobsAndServices = require("../util/expireJobsAndServices");
		await expireJobsAndServices();

		const page = req.query.page >= 1 ? req.query.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);

		let filters = {};
		filters.isActive = true;
		filters.blocked_status = false;
		filters.isDeleted = { $ne: true };
		if (req.query.serviceType) filters.serviceType = req.query.serviceType;
		if (req.query.jobType) filters.jobType = req.query.jobType;
		if (req.query.workType) filters.workType = req.query.workType;
		if (req.query.availability) filters.availability = req.query.availability;
		if (req.query.timePeriod) filters.timePeriod = req.query.timePeriod;
		if (req.query.payType) filters.payType = req.query.payType;
		if (req.query.pay) filters.pay = { $regex: req.query.pay, $options: "i" };
		const date = new Date(req.query.dateOfPosting);
		if (req.query.dateOfPosting) filters.createdAt = { $gt: date.toISOString() };
		if (req.query.jobTittle) filters.jobTittle = { $regex: req.query.jobTittle, $options: "i" };
		if (req.query.stream) filters.stream = { $regex: new RegExp(req.query.stream, "i") };
		if (req.query.location) filters.location = { $regex: new RegExp(req.query.location, "i") };
		if (req.query.tags !== "[]" && req.query.tags) {
			const regexArray = JSON.parse(req.query.tags).map((tag) => new RegExp(tag, "i"));
			filters.tags = { $in: regexArray };
		}

		let sortOption = { createdAt: -1 };
		if (req.query.sort === "popular") sortOption = { vacancies: -1, createdAt: -1 };
		else if (req.query.sort === "highest_salary" || req.query.sort === "salary") sortOption = { pay: -1, createdAt: -1 };
		else if (req.query.sort === "most_recent") sortOption = { createdAt: -1 };

		const jobsData = await Job.find(filters)
			.limit(limit)
			.skip(skip)
			.sort(sortOption)
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

		const jobData = await Job.findOne({ _id: jobId })
			.populate({
				path: "userId",
				select: "-otp -currentPay -expectationPay -videoUrl -experience -resume -skills",
			})
			.lean();

		if (!jobData) {
			return res.status(404).json({ status: false, msg: "Job not found!" });
		}

		let isSaved = false;
		let isApplied = false;

		if (req.user) {
			const saveJobs = await Save.findOne({ userId: req.user._id });
			if (saveJobs && Array.isArray(saveJobs.jobId)) {
				isSaved = saveJobs.jobId.some((id) => id.toString() === jobId.toString());
			}

			const applyRecord = await JobApplication.findOne({
				jobId: jobId,
				$or: [{ applicantId: req.user._id }, { userId: req.user._id }, { applierId: req.user._id }]
			});
			if (applyRecord) {
				isApplied = true;
			}
		}

		return res.json({
			status: true,
			msg: `Job fetch successfully !!`,
			data: jobData,
			isSaved,
			isApplied,
		});
	} catch (error) {
		console.log("Error in getOneJob:", error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.search = async (req, res) => {
	try {
		const page = parseInt(req.query.page) >= 1 ? parseInt(req.query.page) : 1;
		const limit = parseInt(req.query.limit) >= 1 ? parseInt(req.query.limit) : 6;
		const skip = limit * (page - 1);
		const type = req.query.type ? req.query.type : "jobTitle";

		const { query } = req.params;
		const regex = new RegExp(query, "i");

		let filterCondition = {};

		if (type === "jobTitle" || type === "jobTittle") {
			filterCondition = { jobTittle: regex };
		} else if (type === "skills") {
			filterCondition = {
				$or: [
					{ skills: regex },
					{ skillSubCategories: regex },
					{ stream: regex },
					{ note: regex }
				]
			};
		} else if (type === "workType") {
			filterCondition = { workType: regex };
		} else if (type === "companyShortName") {
			filterCondition = {
				$or: [
					{ companyShortName: regex },
					{ companyName: regex }
				]
			};
		} else {
			filterCondition = {
				$or: [
					{ jobTittle: regex },
					{ skills: regex },
					{ stream: regex },
					{ companyName: regex },
					{ companyShortName: regex },
					{ note: regex }
				]
			};
		}

		filterCondition.blocked_status = { $ne: true };
		filterCondition.isDeleted = { $ne: true };

		let data = await Job.find(filterCondition)
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate({
				path: "userId",
				select: "name email phone profileImage userType",
			})
			.lean();

		const totalCount = await Job.countDocuments(filterCondition);
		const pageCount = Math.ceil(totalCount / limit) || 1;

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

		const deleteOne = await Job.findByIdAndUpdate({ _id }, { isDeleted: true }, { new: true }).populate("userId", { name: 1, email: 1, phone: 1 });

		return res.status(200).send({ status: true, msg: "One job deleted !!", data: deleteOne });
	} catch (error) {
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobController.myJobs = async (req, res) => {
	try {
		const expireJobsAndServices = require("../util/expireJobsAndServices");
		await expireJobsAndServices();

		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.query.limit >= 1 ? req.query.limit : 6;
		const skip = limit * (page - 1);
		const targetUserId = (req.query.userId && req.query.userId !== "undefined") ? req.query.userId : req.user._id;

		const jobsData = await Job.find({ userId: targetUserId, isDeleted: { $ne: true } })
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
		const jobCount = await Job.countDocuments({ userId: targetUserId, isDeleted: { $ne: true } });

		const serviceModel = require("../models/service.model");

		const hrAdmins = await adminUserModel.find({
			isDeleted: { $ne: true },
			type: { $in: ["hr", "admin", "sub-admin"] }
		}).select("_id name email number profileImage jobTarget").lean();

		const activeServices = await serviceModel.find({
			userId: targetUserId,
			assignedHR: { $exists: true, $ne: null }
		}).lean();

		const jobs = [];

		await Promise.all(
			jobsData.map(async (e, index) => {
				let inProcess = 0;
				let hired = 0;
				let rejected = 0;

				inProcess = await jobApplicationModel.countDocuments({ jobId: e._id, selectedCandidates: null });
				hired = await jobApplicationModel.countDocuments({ jobId: e._id, selectedCandidates: true });
				rejected = await jobApplicationModel.countDocuments({ jobId: e._id, selectedCandidates: false });

				// 1. Direct assignedHR on job
				let assignedHR = null;
				if (e.assignedHR) {
					assignedHR = hrAdmins.find(hr => hr._id.toString() === e.assignedHR.toString());
				}

				// 2. Check hr.jobTarget
				if (!assignedHR) {
					assignedHR = hrAdmins.find(hr => 
						hr.jobTarget && Array.isArray(hr.jobTarget) && hr.jobTarget.some(target => 
							target.jobIds && Array.isArray(target.jobIds) && target.jobIds.some(j => {
								const jId = j?.jobId?._id ? j.jobId._id.toString() : j?.jobId ? j.jobId.toString() : null;
								return jId && jId === e._id.toString();
							})
						)
					);
				}

				// 3. Check serviceModel for assigned HR matching service
				if (!assignedHR && (e.serviceType || e.addOn)) {
					const matchedService = activeServices.find(s => {
						const sTitle = (s.serviceType || s.serviceData?.title || "").toLowerCase();
						const jTitle = (e.serviceType || e.addOn?.name || e.addOn?.title || "").toLowerCase();
						return (
							(s.jobId && s.jobId.toString() === e._id.toString()) ||
							(sTitle && jTitle && (sTitle.includes(jTitle) || jTitle.includes(sTitle)))
						);
					});

					if (matchedService && matchedService.assignedHR) {
						assignedHR = hrAdmins.find(hr => hr._id.toString() === matchedService.assignedHR.toString());
					}
				}

				jobs[index] = {
					...e,
					inProcess,
					hired,
					rejected,
					assignedHR: assignedHR ? {
						_id: assignedHR._id,
						name: assignedHR.name,
						email: assignedHR.email,
						phone: assignedHR.number || assignedHR.phone || "",
						profileImage: assignedHR.profileImage,
					} : null
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

		const {
			normalizePhone,
			normalizeSkills,
			normalizeEducation,
			normalizeProjects,
			normalizeHeaders,
			calculateProfileComplete
		} = require("../util/normalizeCandidateData");

		// Extract headers from the first row and normalize them to schema keys
		const rawHeaders = rawData[0];
		const headers = normalizeHeaders(rawHeaders);

		// Extract actual data (starting from the second row)
		const formattedData = rawData.slice(1).map((row) => {
			let obj = {};
			headers.forEach((header, index) => {
				obj[header] = row[index] || "";
			});

			// Format 'entryDate' and 'dob' if they are in Excel serial date format (number)
			if (obj.entryDate) {
				if (typeof obj.entryDate === "number") {
					obj.entryDate = moment(XLSX.SSF.parse_date_code(obj.entryDate)).format("YYYY-MM-DD");
				}
			}
			if (obj.dob) {
				if (typeof obj.dob === "number") {
					obj.dob = moment(XLSX.SSF.parse_date_code(obj.dob)).format("YYYY-MM-DD");
				}
			}

			// Normalize candidate fields using custom helper
			if (obj.phone) obj.phone = normalizePhone(obj.phone);
			if (obj.skills) obj.skills = normalizeSkills(obj.skills);
			if (obj.projects) obj.projects = normalizeProjects(obj.projects);
			if (obj.education) obj.education = normalizeEducation(obj.education);

			obj.userType = "jobSeeker";
			obj.registrationSource = "bulk";
			obj.uploadedBy = posterId;
			obj.profileComplete = calculateProfileComplete(obj);
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
			} else {
				// Update existing user with uploaded details & new completion score
				user = await User.findByIdAndUpdate(user._id, { $set: candidate }, { new: true });
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

		const {
			normalizePhone,
			normalizeSkills,
			normalizeEducation,
			normalizeProjects,
			calculateProfileComplete
		} = require("../util/normalizeCandidateData");

		if (userData) {
			if (userData.phone) userData.phone = normalizePhone(userData.phone);
			if (userData.skills) userData.skills = normalizeSkills(userData.skills);
			if (userData.projects) userData.projects = normalizeProjects(userData.projects);
			if (userData.education) userData.education = normalizeEducation(userData.education);
			userData.userType = "jobSeeker";
			userData.registrationSource = "single";
			userData.uploadedBy = posterId;
			userData.profileComplete = calculateProfileComplete(userData);
		}

		// Find or create user
		let user = await User.findOne({ phone: userData?.phone });

		if (!user) {
			user = await User.create(userData);
		} else if (userData) {
			user = await User.findByIdAndUpdate(user._id, { $set: userData }, { new: true });
		}

		
		let application = await JobApplication.findOne({
			applicantId: user._id,
			jobId,
		});

		if (!application) {
			// Create new job application linked to the recruiter who created the job
			application = await JobApplication.create({
				applicantId: user._id,
				applierId: job.userId,
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

jobController.createWithAddon = async (req, res, io) => {
	try {
		const serviceModel = require("../models/service.model");
		const ownUser = await userModel.findOne({ _id: req.user._id });
		if (!ownUser) return res.status(404).json({ status: false, msg: "User record not found!" });

		// Parse job data from form field
		let parsedJobData = {};
		if (req.body.jobData) {
			parsedJobData = typeof req.body.jobData === "string" ? JSON.parse(req.body.jobData) : req.body.jobData;
		}

		if (!parsedJobData.serviceType || !parsedJobData.addOn) {
			return res.status(400).json({ status: false, msg: "Service type and addOn details are required for addon posting!" });
		}
		if (!req.files || !req.files["screenshot"]) {
			return res.status(400).json({ status: false, msg: "Manual payment proof screenshot is required!" });
		}

		// Upload payment screenshot
		const screenshotFile = req.files["screenshot"][0];
		const screenshotUrl = await imageUpload(screenshotFile, `${req.user._id}_job_addon_proof_${Date.now()}`, "paymentProof");
		if (!screenshotUrl) return res.status(500).json({ status: false, msg: "Failed to upload payment screenshot!" });

		const bodyData = {}; 
		bodyData.userId = req.user._id;
		bodyData.jobTittle = parsedJobData.jobTittle;
		bodyData.jobType = parsedJobData.jobType;
		bodyData.workType = parsedJobData.workType;
		bodyData.timePeriod = parsedJobData.timePeriod || "Asia/Kolkata";
		bodyData.note = parsedJobData.note;
		bodyData.pay = parsedJobData.pay || "";
		bodyData.payType = parsedJobData.payType;
		bodyData.location = parsedJobData.location;
		bodyData.companyName = parsedJobData.companyName || ownUser.companyName;
		
		if (parsedJobData.stream) {
			try {
				bodyData.stream = Array.isArray(parsedJobData.stream) ? parsedJobData.stream : JSON.parse(parsedJobData.stream);
			} catch (e) {
				bodyData.stream = Array.isArray(parsedJobData.stream) ? parsedJobData.stream : [parsedJobData.stream];
			}
		} 

		if (!bodyData.stream || !Array.isArray(bodyData.stream) || bodyData.stream.length === 0) {
			return res.status(400).json({
				status: false,
				msg: "Please select at least one educational stream (Arts, Commerce, or Science)!",
			});
		}

		if (parsedJobData.experience) bodyData.experience = parsedJobData.experience;
		if (parsedJobData.availability) bodyData.availability = parsedJobData.availability;
		bodyData.serviceType = parsedJobData.serviceType;
		if (parsedJobData.availability === true || parsedJobData.availability === "true" || parsedJobData.serviceType === "Immediate") {
			bodyData.immediateTagActive = true;
			bodyData.immediateTagExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
		} else {
			bodyData.immediateTagActive = false;
			bodyData.immediateTagExpiresAt = null;
		}
		if (parsedJobData.vacancies) bodyData.vacancies = parsedJobData.vacancies;

		if (bodyData.companyName) {
			let shortName = "";
			const cn = bodyData.companyName.split(" ").filter(Boolean);
			if (cn.length > 1) cn.map((data) => { if (data) shortName += data[0].toUpperCase() });
			else if (cn.length === 1) shortName = cn[0].slice(0, 3).toUpperCase();
			bodyData.companyShortName = shortName;
		}

		bodyData.addOn = parsedJobData.addOn;
		
		if (parsedJobData.skills) {
			let rawSkillsList = [];
			if (typeof parsedJobData.skills === "string") {
				try {
					const parsed = JSON.parse(parsedJobData.skills);
					if (Array.isArray(parsed)) rawSkillsList = parsed;
					else rawSkillsList = [parsedJobData.skills];
				} catch (e) {
					rawSkillsList = parsedJobData.skills.split(",");
				}
			} else if (Array.isArray(parsedJobData.skills)) {
				rawSkillsList = parsedJobData.skills;
			}

			const parsedSkills = [];
			rawSkillsList.forEach((item) => {
				if (typeof item === "string") {
					item.split(",").forEach((s) => {
						const trimmed = s.trim();
						if (trimmed && !parsedSkills.includes(trimmed)) {
							parsedSkills.push(trimmed);
						}
					});
				}
			});
			bodyData.skills = parsedSkills;
		}

		if (parsedJobData.skillDetails) {
			try {
				const extractData = extractSkillSub(typeof parsedJobData.skillDetails === "string" ? JSON.parse(parsedJobData.skillDetails) : parsedJobData.skillDetails);
				bodyData.skillDetails = extractData.mergedSkillDetails;
				bodyData.skillSubCategories = extractData.skillSubCategories;
				if (!bodyData.skills) bodyData.skills = extractData.skills;
			} catch (e) {
				console.log("Job skill details parsing skipped");
			}
		}

		// Tags
		const regex = /#(\w+)/g;
		const tags = [];
		let match;
		while ((match = regex.exec(bodyData.note || "")) !== null) tags.push(match[1]);
		bodyData.tags = tags;

		// Handle company logo file if provided
		if (req.files && req.files["companyLogo"]) {
			const logoFile = req.files["companyLogo"][0];
			const imgUrl = await imageUpload(logoFile, `${req.user._id}_${Date.now()}_CompanyLogo`, "companyLogo");
			if (imgUrl) bodyData.companyLogo = imgUrl;
		}
		if (!bodyData.companyLogo) {
			bodyData.companyLogo = ownUser.companyLogo;
		}

		// Addon Job is created initially hidden and inactive
		bodyData.isActive = false;
		bodyData.isPaymentSuccess = false;

		const addonExpireDate = new Date();
		addonExpireDate.setDate(addonExpireDate.getDate() + 1); // 1 day fallback validity
		const expireDate = addonExpireDate.toISOString().split("T")[0];
		bodyData.expireDate = expireDate;

		const jobRecord = await Job.create(bodyData);

		// Calculate total amount for payment entry
		const GST = parseFloat(((bodyData.addOn.price * 2) / 100).toFixed(2));
		const totalAmount = parseFloat((bodyData.addOn.price + GST).toFixed(2));

		const date = new Date().toISOString().split("T")[0];

		// Create pending service/payment record linked to the job
		const serviceRecord = await serviceModel.create({
			userId: req.user._id,
			addonId: bodyData.addOn._id || bodyData.addOn.id || null,
			date,
			expireDate,
			time: new Date().toLocaleTimeString("en-US", { hour12: false }),
			totalAmount,
			serviceData: {
				name: "Job Addon Payment",
				title: bodyData.serviceType,
				amount: bodyData.addOn.price,
				jobId: jobRecord._id,
			},
			merchantTransactionId: `MANUAL_JOB_ADDON_${jobRecord._id}`,
			isPaymentSuccess: false,
			isActive: false,
			paymentScreenshot: screenshotUrl,
			paymentStatus: "PENDING",
		});

		// Link transaction reference to Job model
		jobRecord.merchantTransactionId = serviceRecord.merchantTransactionId;
		await jobRecord.save();

		// Increment recruiter total posted jobs stats
		ownUser.totalJobs = ownUser.totalJobs + 1;
		await ownUser.save();

		return res.status(200).json({
			status: true,
			msg: "Job with addon posted successfully! Verification is pending from Super Admin.",
			job: jobRecord,
			service: serviceRecord,
		});
	} catch (error) {
		console.error("Error in createWithAddon:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

jobController.myPendingAddons = async (req, res) => {
	try {
		const serviceModel = require("../models/service.model");
		const status = req.query.status || "PENDING";

		const payments = await serviceModel.find({
			userId: req.user._id,
			paymentStatus: status,
			merchantTransactionId: { $regex: /^MANUAL_JOB_ADDON_/ }
		})
		.sort({ createdAt: -1 })
		.lean();

		const results = await Promise.all(
			payments.map(async (payment) => {
				const jobId = payment.merchantTransactionId.replace("MANUAL_JOB_ADDON_", "");
				const jobDetails = await Job.findById(jobId).lean();
				return {
					...payment,
					jobDetails
				};
			})
		);

		return res.status(200).json({ status: true, count: results.length, data: results });
	} catch (error) {
		console.error("Error in myPendingAddons:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
}; 

jobController.generateJdPdf = async (req, res) => {
	try {
		const { id } = req.params;
		const job = await Job.findById(id).lean();
		if (!job) return res.status(404).json({ status: false, msg: "Job description not found!" });

		const PDFDocument = require("pdfkit-table");
		const axios = require("axios");

		const cleanTextForPDF = (text) => {
			if (!text) return "";
			let cleaned = String(text);

			// Normalize Windows \r\n and Mac \r line endings to \n FIRST
			cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

			// Strip Markdown code blocks
			cleaned = cleaned.replace(/^```(?:html)?\s*/gi, "").replace(/\s*```$/gi, "");

			// Convert HTML break / paragraph / list tags to newlines
			cleaned = cleaned
				.replace(/<br\s*\/?>/gi, "\n")
				.replace(/<\/p>/gi, "\n\n")
				.replace(/<\/div>/gi, "\n")
				.replace(/<\/li>/gi, "\n")
				.replace(/<li[^>]*>/gi, "  •  ");

			// Strip remaining HTML tags
			cleaned = cleaned.replace(/<[^>]+>/g, "");

			// Decode HTML entities
			cleaned = cleaned
				.replace(/&nbsp;/gi, " ")
				.replace(/&amp;/gi, "&")
				.replace(/&lt;/gi, "<")
				.replace(/&gt;/gi, ">")
				.replace(/&quot;/gi, '"')
				.replace(/&#39;/gi, "'");

			// Normalize quotes and dashes (en-dash, em-dash -> ASCII '-')
			cleaned = cleaned
				.replace(/[\u2018\u2019]/g, "'")
				.replace(/[\u201C\u201D]/g, '"')
				.replace(/[\u2013\u2014\u2212]/g, "-")
				.replace(/\u2022/g, "•")
				.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");

			// Strip multi-byte Emojis
			cleaned = cleaned.replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, "");

			// Strictly allow ASCII printable characters and newlines \n (ASCII 10)
			cleaned = cleaned.replace(/[^\x0A\x20-\x7E]/g, "");

			return cleaned.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n/g, "\n\n").trim();
		};

		const drawPageBackgroundAndHeader = (doc) => {
			doc.save();
			doc.opacity(0.08)
			   .font("Helvetica-Bold")
			   .fontSize(72)
			   .fillColor("#7E3FF3")
			   .translate(300, 420)
			   .rotate(-45)
			   .text("HIRING ROOF", -250, 0, { align: "center", width: 500 });
			doc.restore();

			doc.rect(0, 0, 595, 10).fill("#7E3FF3");
			doc.font("Helvetica").fontSize(9.5).fillColor("#555555");
		};

		const bodyX = 220;
		const bodyWidth = 335;

		const doc = new PDFDocument({
			size: "A4",
			margin: { top: 40, bottom: 40, left: 40, right: 40 },
			bufferPages: true,
			autoFirstPage: false,
		});

		const isDownload = String(req.query.download).toLowerCase() === "true";
		const companyNameClean = cleanTextForPDF(job.companyName || job.companyShortName || "HiringRoof");
		const safeCompanyName = (companyNameClean || "HiringRoof").replace(/\s+/g, "_");

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			isDownload
				? `attachment; filename="JD_${safeCompanyName}.pdf"`
				: `inline; filename="JD_${safeCompanyName}.pdf"`
		);
		doc.pipe(res);

		doc.on("pageAdded", () => {
			drawPageBackgroundAndHeader(doc);
			doc.x = bodyX;
			doc.y = 40;
		});

		doc.addPage();

		// Header - Logo
		let logoBuffer = null;
		if (job.companyLogo && !job.companyLogo.includes("drive.google.com")) {
			try {
				const logoRes = await axios.get(job.companyLogo, { responseType: "arraybuffer", timeout: 3000 });
				logoBuffer = Buffer.from(logoRes.data);
			} catch (e) {
				console.log("Failed to download remote company logo:", e.message);
			}
		}

		if (!logoBuffer) {
			try {
				const fs = require("fs");
				const path = require("path");
				const fallbackPath = path.join(__dirname, "../../public/image.png");
				if (fs.existsSync(fallbackPath)) {
					logoBuffer = fs.readFileSync(fallbackPath);
				}
			} catch (e) {
				console.log("Failed to read fallback logo:", e.message);
			}
		}

		doc.y = 20;
		if (logoBuffer) {
			doc.image(logoBuffer, 40, doc.y, { fit: [140, 45] });
			doc.y += 50;
		} else {
			doc.y += 15;
		}

		// Divider Line
		doc.strokeColor("#E0E0E0").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
		doc.y += 20;

		const mainStartY = doc.y;

		// 1. Sidebar (Width: 160px)
		const jobTitleClean = cleanTextForPDF(job.jobTittle || "Job Position");
		const locationClean = cleanTextForPDF(job.location || "Multiple Locations");
		const workTypeClean = cleanTextForPDF(job.workType || "Full-Time");
		const jobTypeClean = job.jobType === "wfh" ? "Remote" : "On-site";
		const payClean = cleanTextForPDF(job.pay || "Competitive Pay").replace(/\$/g, "Rs. ");
		const payTypeClean = cleanTextForPDF(job.payType || "monthly");

		doc.fontSize(10.5).fillColor("#222222").font("Helvetica-Bold").text(companyNameClean, 40, mainStartY, { width: 160 });
		doc.fontSize(9.5).fillColor("#666666").font("Helvetica").text(`Location: ${locationClean}`, 40, doc.y + 4, { width: 160 });

		doc.fontSize(9.5).fillColor("#888888").font("Helvetica-Bold").text("DETAILS:", 40, doc.y + 16, { width: 160 });
		doc.fontSize(9.5).fillColor("#666666").font("Helvetica")
		   .text(`Role: ${workTypeClean}`, 40, doc.y + 4, { width: 160 })
		   .text(`Policy: ${jobTypeClean}`, 40, doc.y + 2, { width: 160 })
		   .text(`Salary: ${payClean} / ${payTypeClean}`, 40, doc.y + 2, { width: 160 });

		// 2. Main Body Column (x = 220, width = 335)
		doc.x = bodyX;
		doc.y = mainStartY;

		doc.fontSize(16).fillColor("#222222").font("Helvetica-Bold").text(jobTitleClean, { width: bodyWidth });
		doc.fontSize(9).fillColor("#888888").font("Helvetica-Oblique").text(`Posted on ${new Date(job.createdAt || Date.now()).toLocaleDateString("en-IN")}`, { width: bodyWidth });

		doc.moveDown(0.8);
		doc.fontSize(10.5).fillColor("#444444").font("Helvetica-Bold").text("About Company:", { width: bodyWidth });
		doc.moveDown(0.2);
		doc.fontSize(9.5).fillColor("#555555").font("Helvetica-Oblique").text(
			"We are leading recruiters dedicated to connecting top-tier talent with ideal career paths, helping applicants match and establish stable growth directions in standard technical segments.",
			{ width: bodyWidth, align: "justify", lineGap: 2.5 }
		);

		const noteClean = cleanTextForPDF(job.note || "No detailed job summary provided.");
		doc.moveDown(0.8);
		doc.fontSize(10.5).fillColor("#444444").font("Helvetica-Bold").text("Job Summary:", { width: bodyWidth });
		doc.moveDown(0.2);
		doc.fontSize(9.5).fillColor("#555555").font("Helvetica").text(
			noteClean,
			{ width: bodyWidth, align: "left", lineGap: 3 }
		);

		if (job.skills && job.skills.length > 0) {
			doc.moveDown(0.8);
			doc.fontSize(10.5).fillColor("#444444").font("Helvetica-Bold").text("Required Skills & Knowledge:", { width: bodyWidth });
			doc.moveDown(0.2);
			doc.fontSize(9.5).fillColor("#555555").font("Helvetica");
			job.skills.forEach((skill) => {
				const cleanSkill = cleanTextForPDF(skill);
				if (cleanSkill) {
					doc.fillColor("#7E3FF3").text("  •  ", { continued: true, width: bodyWidth }).fillColor("#555555").text(cleanSkill);
				}
			});
		}

		// Draw page footers on all pages (Page 1, Page 2, etc.)
		const pageCount = doc.bufferedPageRange().count;
		for (let i = 0; i < pageCount; i++) {
			doc.switchToPage(i);

			const oldBottomMargin = doc.page.margins.bottom;
			doc.page.margins.bottom = 0;

			const footerY = 755;
			const jobDetailsUrl = `https://www.hiringroof.com/job-card?id=${job._id}`;
			const supportMeetUrl = "https://meet.google.com/xik-jmne-cqq";

			doc.save();
			doc.strokeColor("#E5E7EB").lineWidth(0.75).moveTo(40, footerY - 8).lineTo(555, footerY - 8).stroke();

			doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#374151")
			   .text("View Job Post: ", 40, footerY, { continued: true })
			   .font("Helvetica").fontSize(8.5).fillColor("#7E3FF3")
			   .text(jobDetailsUrl, { link: jobDetailsUrl, underline: true });

			doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#374151")
			   .text("Meet Support: ", 40, footerY + 14, { continued: true })
			   .font("Helvetica").fontSize(8.5).fillColor("#2563EB")
			   .text(supportMeetUrl, { link: supportMeetUrl, underline: true });

			doc.restore();
			doc.page.margins.bottom = oldBottomMargin;
		}

		doc.end();
	} catch (error) {
		console.error("Error in generateJdPdf:", error);
		if (!res.headersSent) {
			return res.status(500).json({ status: false, msg: error.message });
		}
	}
};
jobController.editJobPost = async (req, res) => {
	try {
		const { jobId } = req.params;
		if (!jobId) {
			return res.status(400).json({ status: false, msg: "Job Id not found!" });
		}

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ status: false, msg: "Job not found for this id!" });
		}

		const ownsJob = job.userId && req.user && job.userId.toString() === req.user._id.toString();
		const isSuperAdmin = req.user && (req.user.type === "superAdmin" || req.user.type === "superadmin");

		if (!isSuperAdmin && !ownsJob) {
			return res.status(403).json({ status: false, msg: "You do not have permission to edit this job!" });
		}

		const updateData = {};
		
		const allowedFields = [
			"jobTittle", "jobType", "workType", "pay", "payType", 
			"location", "companyName", "companyShortName", "experience", 
			"vacancies", "note", "availability", "stream", "skills", "serviceType"
		];

		allowedFields.forEach(field => {
			if (req.body[field] !== undefined) {
				updateData[field] = req.body[field];
			}
		});

		if (
			(req.body.availability === true || req.body.availability === "true" || req.body.serviceType === "Immediate") &&
			(!job.immediateTagActive || !job.availability || job.serviceType !== "Immediate")
		) {
			updateData.immediateTagActive = true;
			updateData.immediateTagExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
			updateData.immediateTagRequest = "NONE";
		}

		if (req.body.stream !== undefined) {
			try {
				updateData.stream = typeof req.body.stream === "string" ? JSON.parse(req.body.stream) : req.body.stream;
			} catch (e) {
				updateData.stream = Array.isArray(req.body.stream) ? req.body.stream : [req.body.stream];
			}
			if (!updateData.stream || !Array.isArray(updateData.stream) || updateData.stream.length === 0) {
				return res.status(400).json({
					status: false,
					msg: "Please select at least one educational stream (Arts, Commerce, or Science)!",
				});
			}
		}
		if (req.body.skills && typeof req.body.skills === "string") {
			try { updateData.skills = JSON.parse(req.body.skills); } catch (e) {}
		}

		if (req.body.pay === "") {
			updateData.pay = "";
		}

		const updatedJob = await Job.findByIdAndUpdate(
			jobId,
			{ $set: updateData },
			{ new: true }
		);

		return res.status(200).json({
			status: true,
			msg: "Job post updated successfully!",
			data: updatedJob
		});
	} catch (error) {
		console.error("Error in editJobPost:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};
jobController.getAllAvailableCategories = async(req,res)=>{
	try {
		const skills = await Job.distinct("skills", { blocked_status: { $ne: true }, isActive: true });
		const skillSubCategories = await Job.distinct("skillSubCategories", { blocked_status: { $ne: true }, isActive: true });
		const streams = await Job.distinct("stream", { blocked_status: { $ne: true }, isActive: true });

		const uniqueSkills = [...new Set([...skills, ...skillSubCategories].map(s => typeof s === 'string' ? s.trim() : "").filter(Boolean))].sort();
		const normalizedStreams = streams
			.map(s => (typeof s === "string" ? s.trim().toLowerCase() : ""))
			.map(s => (s === "tech" ? "science" : s))
			.filter(Boolean);
		const uniqueStreams = [...new Set(normalizedStreams)]
			.filter(s => ["arts", "commerce", "science"].includes(s))
			.sort();

		return res.status(200).json({
			status: true,
			data: {
				skills: uniqueSkills,
				streams: uniqueStreams,
				jobTypes: ["wfh", "wfo"],
				workTypes: ["contractual", "part time", "full time", "internship", "hourly"]
			}
		});
	} catch (error) {
		console.error("Error in getAllAvailableCategories:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

jobController.requestImmediateTag = async (req, res) => {
	try {
		const { jobId } = req.params;
		if (!jobId) {
			return res.status(400).json({ status: false, msg: "Job ID is required!" });
		}

		const job = await Job.findById(jobId);
		if (!job) {
			return res.status(404).json({ status: false, msg: "Job not found!" });
		}

		// Verify recruiter ownership
		if (job.userId.toString() !== req.user._id.toString()) {
			return res.status(403).json({ status: false, msg: "Unauthorized request!" });
		}

		// Availability check
		if (!job.availability && job.serviceType !== "Immediate") {
			return res.status(400).json({ status: false, msg: "This job is not marked for Immediate availability." });
		}

		job.immediateTagRequest = "PENDING";
		job.immediateTagRequestedAt = new Date();
		await job.save();

		return res.status(200).json({
			status: true,
			msg: "Immediate hiring tag reactivation requested successfully! Pending approval from Admin.",
			data: job,
		});
	} catch (error) {
		console.error("Error in requestImmediateTag:", error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = jobController;
