const Job = require("../models/job.model");
const JobApplication = require("../models/jobApplication.model");
const User = require("../models/user.model");
const AdminUser = require("../models/adminUser.model");
const convertTo12HourFormat = require("../util/convertTo12HourFormat");
const getProfileImages = require("../util/getprofileImages");
const createNotification = require("../util/createNotification");
const { ObjectId } = require("mongoose").Types;
const mongoose = require("mongoose");
const adminUserModel = require("../models/adminUser.model");
const { createMeetLink } = require("../util/googleCalendar.util");

const jobApplication = {};
// COmmit
jobApplication.findBlockedJobsByHR = async (req, res) => {
    try {
        let hrFilter = {};
        const { hrId } = req.query;
        
        if (hrId) {
            hrFilter = { 'blocked.blockedBy': hrId };
        }
        
        const blockedJobs = await Job.find({ blocked_status: true, ...hrFilter }).sort({ "blocked.date": -1 });

        const applicantIds = await JobApplication.aggregate([
            {
                $match: {
                    jobId: {
                        $in: blockedJobs.map((job) => job._id),
                    },
                },
            },
            {
                $group: {
                    _id: "$jobId",
                    applicants: { $addToSet: "$applicantId" },
                },
            },
        ]);

        const applicantIdMap = {};
        applicantIds.forEach((appId) => {
            applicantIdMap[appId._id.toString()] = appId.applicants;
        });

        const getProfileImagesPromises = blockedJobs.map(async (job) => {
            const applicantIds = applicantIdMap[job._id.toString()] || [];
            const profileImages = await getProfileImages(applicantIds);
            return {
                jobId: job._id,
                profileImages: profileImages
            };
        });

        const jobsWithProfileImages = await Promise.all(getProfileImagesPromises);

        const blockedJobsWithApplicantInfo = blockedJobs.map((job) => {
            const applicantInfo = jobsWithProfileImages.find((item) => item.jobId.toString() === job._id.toString());
            return {
                ...job.toObject(),
                applicantIds: applicantIdMap[job._id.toString()] || [],
                profileImages: applicantInfo.profileImages
            };
        });

        return res.status(200).json({ status: true, data: blockedJobsWithApplicantInfo });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};


jobApplication.getJobApplicationsByStatus = async (req, res) => {
    try {
        const { hrId, filterType, page = 1, limit = 10 } = req.query;

        let hrFilter = {};

        if (hrId) {
            if (!mongoose.Types.ObjectId.isValid(hrId)) {
                return res.status(400).json({ status: false, message: "Invalid HR ID" });
            }
            hrFilter = { _id: hrId };
        }

        const hrList = await AdminUser.find(hrFilter);
        if (!hrList.length) {
            return res.status(404).json({ status: false, message: "HRs not found" });
        }

        let allApplications = [];

        // Iterate over each HR to fetch job applications
        for (const hr of hrList) {
            const jobIds = hr.jobTarget.map((target) => target.jobIds.map((idObj) => idObj.jobId));

            // Fetch applications for each job ID
            for (const jobId of jobIds) {
                const applications = await JobApplication.find({ jobId }).populate("applicantId applierId jobId");
                allApplications = allApplications.concat(applications);
            }
        }

        let filteredApplications = [];

        for (const hr of hrList) {
            const jobIds = hr.jobTarget.map((target) => target.jobIds.map((idObj) => idObj.jobId));

            for (const jobId of jobIds) {
                const applications = await JobApplication.find({ jobId }).populate("applicantId applierId jobId");

                applications.forEach((application) => {
                    if (application.jobId.blocked_status) {
                        return;
                    }

                    if (filterType === "Interview1" && application.interviews && !application.selectedCandidates) {
                        filteredApplications.push(application);
                    }
                    if (filterType === "Interview2" && application.interviews2 && !application.selectedCandidates) {
                        filteredApplications.push(application);
                    }
                    if (filterType === "Selected" && application.selectedCandidates) {
                        filteredApplications.push(application);
                    }
                    if (filterType === "Rejected" && !application.selectedCandidates) {
                        filteredApplications.push(application);
                    }
                });
            }
        }

        if (filterType === "CompanyBlocked") {
            let blockedCompanies = [];

            for (const application of allApplications) {
                const company = await User.findOne({ _id: application.applierId });
                if (company && company.blocked_status && company.blocked.blockedBy.equals(hrId)) {
                    const populatedApplication = await application.populate("applicantId applierId");
                    blockedCompanies.push(populatedApplication);
                }
            }

            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;

            const paginatedData = blockedCompanies.slice(startIndex, endIndex);
            return res.status(200).json({ status: true, data: paginatedData });
        }

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedData = filteredApplications.slice(startIndex, endIndex);

        return res.status(200).json({ status: true, data: paginatedData });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};



jobApplication.addFeedback = async (req, res) => {
	try {
		const {  jobId, experience, comments } = req.body;
		const hrId = req.user._id;
		const _id = jobId; 

		if (!_id || !mongoose.Types.ObjectId.isValid(_id))
			return res.status(400).json({ status: false, msg: "Invalid Job ID" });

		if (!hrId || !mongoose.Types.ObjectId.isValid(hrId)) return res.status(400).json({ status: false, msg: "Invalid HR ID" });

		const jobApplication = await JobApplication.findOne({ _id });
		if (!jobApplication)
			return res.status(404).json({ status: false, msg: "Job Application not found for the provided Job ID and HR ID" });

		jobApplication.feedback = {
			comments,
			experience,
			givenBy: hrId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await jobApplication.save();

		return res.status(200).json({ status: true, msg: "Feedback added successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

jobApplication.acceptRejectRescheduleRequest = async (req, res, io) => {
	try {
		const { _id, decision, newDate, newTime, link, interviewType } = req.body;

		if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
			return res.status(400).json({ message: "Invalid Job Application ID" });
		}

		const jobApplication = await JobApplication.findById(_id).populate("jobId");
		if (!jobApplication) {
			return res.status(404).json({ message: "Job Application not found" });
		}

		if (!jobApplication.temp || Object.keys(jobApplication.temp).length === 0) {
			return res.status(404).json({ message: "No pending rescheduling requests for this job application" });
		}

		const requestToHandle = jobApplication.temp;
		const type = interviewType || requestToHandle.interviewType || "interviews";

		if (decision === "accept") {
			jobApplication.rescheduledInterviews.push({
				originalDate: jobApplication[`${type}Date`],
				originalTime: jobApplication[`${type}Time`],
				newDate: newDate || requestToHandle.newDate,
				newTime: convertTo12HourFormat(newTime) || requestToHandle.newTime,
				reason: requestToHandle.reason || "Rescheduled by Admin",
				rescheduledAt: new Date(),
				interviewType: type,
			});

			jobApplication[`${type}Date`] = newDate || requestToHandle.newDate;
			jobApplication[`${type}Time`] = convertTo12HourFormat(newTime) || requestToHandle.newTime;
		}

		if (link) jobApplication.interviewExtras = link;

		const data1 = await createNotification({
			senderId: req.user._id,
			receiverId: jobApplication.applicantId,
			senderType: "adminUser",
			title: `${jobApplication.jobId.jobTittle} interview reschedule`,
			desc: `${jobApplication.jobId.jobTittle} interview reschedule on ${
				jobApplication[`${type}Date`]
			} at ${jobApplication[`${type}Time`]}`,
			logo: jobApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data1.receiverId._id}`, data1);

		const data2 = await createNotification({
			senderId: req.user._id,
			receiverId: jobApplication.applierId,
			senderType: "adminUser",
			title: `${jobApplication.jobId.jobTittle} interview reschedule`,
			desc: `${jobApplication.jobId.jobTittle} interview reschedule on ${
				jobApplication[`${type}Date`]
			} at ${jobApplication[`${type}Time`]}`,
			logo: jobApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		jobApplication.temp = null;

		await jobApplication.save();

		return res.status(200).send({
			status: true,
			message: "Rescheduling request handled successfully",
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: error.message });
	}
};

jobApplication.getInterviewsPassedDate = async (req, res) => {
	try {
		const { hrId, interviewField, month } = req.query;

		if (!ObjectId.isValid(hrId)) return res.status(400).json({ status: false, msg: "Invalid HR ObjectId" });

		const hr = await AdminUser.findById(hrId);

		if (!hr) return res.status(404).json({ status: false, msg: "HR not found" });

		const currentDate = new Date(); // Get the current date/time

		const jobApplications = await JobApplication.find({
			jobId: { $in: hr.jobTarget.flatMap((target) => target.jobIds.map((idObj) => idObj.jobId)) },
		}).populate("applicantId applierId jobId");

		const interviewsPassedDate = jobApplications
			.filter((application) => {
				let interviewPending;
				if (interviewField === "interviews2") {
					interviewPending = application.interviewStatus && application.interviewStatus["interview2Pending"] === true;
				} else {
					interviewPending = application.interviewStatus && application.interviewStatus["interviewPending"] === true;
				}
				return (
					interviewPending &&
					new Date(application[`${interviewField}Date`]) < currentDate &&
					new Date(application[`${interviewField}Date`]).getMonth() == parseInt(month) - 1
				);
			}) // Filter for passed interview dates with the specified month
			.map((application) => application);

		return res.status(200).send({
			status: true,
			msg: "Here are the listed employees with interviews passed date !!",
			data: interviewsPassedDate,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

jobApplication.getInterviewsByDate = async (req, res) => {
    try {
        const { startDate, endDate, hrId, interviewField } = req.query;

        // Check if hrId is provided and valid
        if (hrId && !ObjectId.isValid(hrId)) {
            return res.status(400).json({ message: "Invalid HR ObjectId" });
        }

        let jobApplications;
        if (hrId) {
            // If hrId is provided, fetch jobApplications for that HR only
            const hr = await AdminUser.findById(hrId);
            if (!hr) {
                return res.status(404).json({ message: "HR not found" });
            }
            jobApplications = await JobApplication.find({
                jobId: { $in: hr.jobTarget.flatMap((target) => target.jobIds.map((idObj) => idObj.jobId)) },
            }).populate("applicantId applierId jobId");
        } else {
            // If hrId is not provided, fetch jobApplications for all HRs
            jobApplications = await JobApplication.find().populate("applicantId applierId jobId");
        }

        const interviewsByDateTime = {};

        jobApplications.forEach((application) => {
            let interviewPending;
            if (interviewField === "interviews2") {
                interviewPending = application.interviewStatus && application.interviewStatus["interview2Pending"] === false;
            } else {
                interviewPending = application.interviewStatus && application.interviewStatus["interviewPending"] === false;
            }
            if (
                interviewPending &&
                application[`${interviewField}Date`] >= startDate &&
                application[`${interviewField}Date`] <= endDate
            ) {
                const interviewDate = application[`${interviewField}Date`];
                const interviewTime = application[`${interviewField}Time`];
                const all_job_details = application;

                const dateTimeKey = `${interviewDate}_${interviewTime}`;

                if (!interviewsByDateTime[dateTimeKey]) {
                    interviewsByDateTime[dateTimeKey] = [];
                }

                interviewsByDateTime[dateTimeKey].push(all_job_details);
            }
        });

        const data = Object.keys(interviewsByDateTime).map((dateTimeKey) => ({
            interviewsTime: dateTimeKey.split("_")[1],
            days_data: {
                interviewsDate: dateTimeKey.split("_")[0],
                jobLists: interviewsByDateTime[dateTimeKey],
            },
        }));

        return res.status(200).json({
            status: true,
            msg: "Here are the listed employees!!",
            data: data,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, msg: error.message });
    }
};


jobApplication.apply = async (req, res, io) => {
	try {
		const job = await Job.findOne({ _id: req.params.id });
		if (!job) return res.status(404).send({ status: false, msg: "Not valid job!!" });

		const applicantId = req.user._id;
		const applierId = job.userId;
		const jobId = job._id;

		if (applicantId.toString() === applierId.toString())
			return res.status(200).send({ status: false, msg: "You can't apply for your own job !!", data: [] });

		const applicationBody = { applicantId, applierId, jobId };
		const applicationFind = await JobApplication.findOne(applicationBody)
			.populate({ path: "applicantId", select: "name email phone isHired" })
			.populate({ path: "applierId", select: "name email phone" })
			.populate({ path: "jobId", populate: [{ path: "userId", select: "name profileImage userType phone" }] });
		console.log(applicationFind);

		if (applicationFind)
			return res.status(200).send({ status: true, msg: "You already apply for this job !!", data: applicationFind });

		applicationBody.skillsLevel = req.body;

		await JobApplication.create(applicationBody);

		const populatedData = await JobApplication.findOne({ applicantId, applierId, jobId })
			.populate({ path: "applicantId", select: "name email phone isHired" })
			.populate({ path: "applierId", select: "name email phone" })
			.populate({ path: "jobId", populate: [{ path: "userId", select: "name profileImage userType phone" }] });

		const data = await createNotification({
			senderId: applicantId,
			receiverId: applierId,
			title: `${populatedData.jobId.jobTittle}`,
			desc: `${populatedData.applicantId.name === "" ? "Someone" : populatedData.applicantId.name} apply for your ${
				populatedData.jobId.jobTittle
			} job`,
			logo: populatedData.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		return res.status(200).send({
			status: true,
			msg: "Your job application successfully submitted !!",
			data: populatedData,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.remove = async (req, res, io) => {
	try {
		let applicationFind = null;
		applicationFind = await JobApplication.findOne({ _id: req.params.id });
		const jobFind = await Job.findOne({ _id: req.params.id });
		if (jobFind)
			applicationFind = await JobApplication.findOne({
				applicantId: req.user._id,
				applierId: jobFind.userId,
				jobId: jobFind._id,
			});

		if (!applicationFind)
			return res
				.status(200)
				.send({ status: true, msg: "You didn't apply for this job yet !!", isDeleted: false, data: [] });

		const data = await JobApplication.findByIdAndDelete(applicationFind._id);

		// const data = await createNotification({
		// 	senderId: applicantId,
		// 	receiverId: applierId,
		// 	title: `${populatedData.jobId.jobTittle}`,
		// 	desc: `${populatedData.applicantId.name === "" ? "Someone" : populatedData.applicantId.name} apply for your ${
		// 		populatedData.jobId.jobTittle
		// 	} job`,
		// 	logo: populatedData.jobId.companyLogo,
		// });
		// io.emit(`notifications_${data.receiverId._id}`, data);

		return res.status(200).send({
			status: true,
			msg: "Your job application successfully deleted !!",
			isDeleted: true,
			data: data,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.get = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id; 

		const jobSeeker = await JobApplication.find({ applicantId: userId, ...req.query })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate("applicantId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.lean();
		const jobSeekerJobCount = await JobApplication.countDocuments({ applicantId: userId, ...req.query });

		const company = await JobApplication.find({ applierId: userId, ...req.query })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({ applierId: userId, ...req.query });

		if (jobSeeker.length > 0) {
			return res.status(200).send({
				status: true,
				msg: "Your applied jobs !!",
				count: jobSeekerJobCount,
				pageCount: parseInt(Math.ceil(jobSeekerJobCount / limit)),
				currentPage: parseInt(page),
				data: jobSeeker,
			});
		}

		if (company.length > 0) {
			return res.status(200).send({
				status: true,
				msg: "Candidate who applied for jobs !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: company,
			});
		}

		return res.status(200).send({
			status: true,
			msg: "You don't have any applicant or applied job !!",
			count: companyJobCount || jobSeekerJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount || jobSeekerJobCount / limit)),
			currentPage: parseInt(page),
			data: [],
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.all = async (req, res) => {
	try {
		const bodyData = req.body;

		const application = await JobApplication.findOne({ _id: req.params._id || req.params.id });

		const applicationUserCheck = await JobApplication.findOne({ _id: req.params, applierId: req.user._id });

		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });
		if (!applicationUserCheck)
			return res.status(404).send({ status: false, msg: "The application doesn't belong to this user !!" });

		const updatedApplication = await JobApplication.findByIdAndUpdate(application._id, bodyData, { new: true })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate("applicantId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			});

		return res.status(200).send({ status: true, msg: "Application updated !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

// Company Start
jobApplication.getApplications = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({ applierId: userId, shortlist: false, interviews: false, interviews2: false })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({
			applierId: userId,
			shortlist: false,
			interviews: false,
			interviews2: false,
		});

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any applicant !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Candidate who applied for jobs !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getShortlist = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({
			applierId: userId,
			shortlist: true,
			interviews: false,
			interviews2: false,
			selectedCandidates: null,
		})
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({
			applierId: userId,
			shortlist: true,
			interviews: false,
			interviews2: false,
			selectedCandidates: null,
		});

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any shortlist candidates !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Shortlist candidates !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getInterviews = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({
			applierId: userId,
			shortlist: true,
			interviews: true,
			interviews2: false,
			selectedCandidates: null,
		})
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({
			applierId: userId,
			shortlist: false,
			interviews: true,
			interviews2: false,
			selectedCandidates: null,
		});

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any interview selected candidates !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Interview selected candidates !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getInterviews2 = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({
			applierId: userId,
			shortlist: true,
			interviews: true,
			interviews2: true,
			selectedCandidates: null,
		})
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({
			applierId: userId,
			shortlist: false,
			interviews: false,
			interviews2: true,
			selectedCandidates: null,
		});

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any interview 2 selected candidates !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Interview 2 selected candidates !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getSelectedCandidates = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({ applierId: userId, selectedCandidates: true })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({ applierId: userId, selectedCandidates: true });

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any Selected candidates !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Selected candidates !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

// Actions
jobApplication.shortlist = async (req, res, io) => {
	try {
		const application = await JobApplication.findOne({ _id: req.params._id || req.params.id });
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const userCheck = await JobApplication.findOne({ _id: req.params, applierId: req.user._id });
		if (!userCheck) return res.status(404).send({ status: false, msg: "The application doesn't belong to this user !!" });

		const updatedApplication = await JobApplication.findByIdAndUpdate(application._id, { shortlist: true, pipelineStatus: "Shortlisted" }, { new: true })
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		await User.findByIdAndUpdate(application.applicantId, { status: "Shortlisted", response: "Shortlisted" });

		const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You are shortlisted for ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `You shortlisted ${
				updatedApplication.applicantId.name === "" ? "Someone" : updatedApplication.applicantId.name
			} for ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for shortlist !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.notSelected = async (req, res, io) => {
	try {
		const application = await JobApplication.findOne({ _id: req.params._id || req.params.id });
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const userCheck = await JobApplication.findOne({ _id: req.params, applierId: req.user._id });
		if (!userCheck) return res.status(404).send({ status: false, msg: "The application doesn't belong to this user !!" });

		const updatedApplication = await JobApplication.findByIdAndUpdate(
			application._id,
			{ selectedCandidates: false, pipelineStatus: "Rejected" },
			{ new: true }
		)
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		await User.findByIdAndUpdate(application.applicantId, { status: "Rejected", response: "Rejected" });

		const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You are not selected for ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `You rejected ${updatedApplication.applicantId.name} for ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for not selected !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.doInterviewSelect = async (req, res, io) => {
	try {
		if (!req.body.interviewsDate)
			return res.status(404).send({ status: true, msg: "Please provide a interview date !!", data: [] });
		if (!req.body.interviewsTime)
			return res.status(404).send({ status: true, msg: "Please provide a interview time !!", data: [] });

		const time = convertTo12HourFormat(req.body.interviewsTime);

		const application = await JobApplication.findOne({ _id: req.params._id || req.params.id })
			.populate("jobId")
			.populate("applicantId")
			.populate("applierId");
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const meetLink = await createMeetLink({
			candidateEmail: application.applicantId?.email,
			candidateName: application.applicantId?.name,
			companyName: application.jobId?.companyName,
			jobTitle: application.jobId?.jobTittle,
			date: req.body.interviewsDate,
			time: time,
			adminEmail: req.user?.email,
			recruiterEmail: application.applierId?.email,
		}); 

		const updatedApplication = await JobApplication.findByIdAndUpdate(
			application._id,
			{
				interviews: true,
				interviewsDate: req.body.interviewsDate,
				interviewsTime: time,
				interviewExtras: meetLink || "",
				pipelineStatus: "Interview 1",
			},
			{ new: true }
		)
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		await User.findByIdAndUpdate(application.applicantId, { status: "Interview 1", response: "Interview 1" });

		const hrAdmin = await adminUserModel.findOne({ "jobTarget.jobIds.jobId": application.jobId });
		if (hrAdmin) {
			hrAdmin.interviewScheduled += 1; // Increase the interviewScheduled field by 1
			await hrAdmin.save();
		}

		const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You have been selected for interview for the ${updatedApplication.jobId.jobTittle} job on ${updatedApplication.interviewsDate} at ${updatedApplication.interviewsTime}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `You schedule first round of interview with ${updatedApplication.applicantId.name} for ${updatedApplication.jobId.jobTittle} job on ${updatedApplication.interviews2Date} at ${updatedApplication.interviewsTime}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for interview !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.doInterview2Select = async (req, res, io) => {
	try {
		if (!req.body.interviews2Date)
			return res.status(404).send({ status: true, msg: "Please provide a interview date !!", data: [] });
		if (!req.body.interviews2Time)
			return res.status(404).send({ status: true, msg: "Please provide a interview time !!", data: [] });

		const time = convertTo12HourFormat(req.body.interviews2Time);

		const application = await JobApplication.findOne({ _id: req.params._id || req.params.id })
			.populate("jobId")
			.populate("applicantId")
			.populate("applierId");
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const meetLink = await createMeetLink({
			candidateEmail: application.applicantId?.email,
			candidateName: application.applicantId?.name,
			companyName: application.jobId?.companyName,
			jobTitle: application.jobId?.jobTittle,
			date: req.body.interviews2Date,
			time: time,
			adminEmail: req.user?.email,
			recruiterEmail: application.applierId?.email,
		});

		const updatedApplication = await JobApplication.findByIdAndUpdate(
			application._id,
			{
				interviews2: true,
				interviews2Date: req.body.interviews2Date,
				interviews2Time: time,
				interviewExtras: meetLink || "",
				pipelineStatus: "Interview 2",
			},
			{ new: true }
		)
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		await User.findByIdAndUpdate(application.applicantId, { status: "Interview 2", response: "Interview 2" });

			const hrAdmin = await adminUserModel.findOne({ "jobTarget.jobIds.jobId": application.jobId });
			if (hrAdmin) {
				hrAdmin.interviewScheduled += 1; // Increase the interviewScheduled field by 1
				await hrAdmin.save();
			}

		const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You are selected for a second round of interviews for the ${updatedApplication.jobId.jobTittle} job on ${req.body.interviews2Date} at ${updatedApplication.interviews2Time}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `You schedule second round of interview with ${updatedApplication.applicantId.name} for ${updatedApplication.jobId.jobTittle} job on ${updatedApplication.interviews2Date} at ${updatedApplication.interviews2Time}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for interview 2 !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.selected = async (req, res, io) => {
	try {
		const offerLetterDate = req.body.offerLetterDate;
		const offerLetterTime = convertTo12HourFormat(req.body.offerLetterTime);

		const application = await JobApplication.findOne({ _id: req.params._id || req.params.id });
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		// const userCheck = await JobApplication.findOne({ _id: req.params, applierId: req.user._id });
		// if (!userCheck) return res.status(404).send({ status: false, msg: "The application doesn't belong to this user !!" });

		const ownUser = await User.findOne({ _id: req.user._id });

		const findUser = await User.findOne({ _id: application.applicantId });
		findUser.isHired = true;
		findUser.status = "Selected";
		findUser.response = "Selected";
		findUser.selectedBadge = true;
		if (!findUser.selectedIn.some(item => item.job && item.job.toString() === application.jobId.toString())) {
			findUser.selectedIn.push({ job: application.jobId, date: new Date() });
		}
		await findUser.save();

		const updatedApplication = await JobApplication.findByIdAndUpdate(
			application._id,
			{ selectedCandidates: true, offerLetterDate, offerLetterTime, pipelineStatus: "Selected" },
			{ new: true }
		)
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

					// Extract jobId
		const jobId = application.jobId;

		// Update jobTarget for each adminUser
		const adminUsers = await AdminUser.find();
		for (const adminUser of adminUsers) {
			if (adminUser.type === "superAdmin") continue; // Skip superAdmin
			for (const monthJob of adminUser.jobTarget) {
				if (monthJob.jobIds.find(job => job.jobId.equals(jobId))) {
					// Increment jobsDone for the month
					monthJob.jobsDone += 1;
					adminUser.totalHired += 1; // Increment totalHired for the admin user
					break; // No need to continue searching other months
				}
			}
			await adminUser.save(); // Save the updated adminUser
		}

		ownUser.totalHired = ownUser.totalHired + 1;
		await ownUser.save();

		const data = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You have been selected for the ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderId: updatedApplication.applierId,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `You selected ${updatedApplication.applicantId.name} for ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for selected !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};
// Company End

// Job Seeker Start
jobApplication.getApplicationsJobSeeker = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({
			applicantId: userId,
			shortlist: false,
			interviews: false,
			interviews2: false,
			selectedCandidates: { $in: [false, null] },
		})
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({
			applierId: userId,
			shortlist: false,
			interviews: false,
			interviews2: false,
			selectedCandidates: { $in: [false, null] },
		});

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any applicant !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Candidate who applied for jobs !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getShortlistJobSeeker = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const jobSeeker = await JobApplication.find({
			applicantId: userId,
			shortlist: true,
			interviews: false,
			interviews2: false,
			selectedCandidates: null,
		})
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const jobSeekerJobCount = await JobApplication.countDocuments({
			applicantId: userId,
			shortlist: true,
			interviews: false,
			interviews2: false,
			selectedCandidates: null,
		});

		if (jobSeeker.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't shortlist in any company yet !!",
				count: jobSeekerJobCount,
				pageCount: parseInt(Math.ceil(jobSeekerJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Your shortlist jobs !!",
			count: jobSeekerJobCount,
			pageCount: parseInt(Math.ceil(jobSeekerJobCount / limit)),
			currentPage: parseInt(page),
			data: jobSeeker,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getInterviewsJobSeeker = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const jobSeeker = await JobApplication.find({
			applicantId: userId,
			interviews: true,
			interviews2: false,
			selectedCandidates: { $in: [false, null] },
		})
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const jobSeekerJobCount = await JobApplication.countDocuments({
			applicantId: userId,
			interviews: true,
			interviews2: false,
			selectedCandidates: { $in: [false, null] },
		});

		if (jobSeeker.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any interview yet !!",
				count: jobSeekerJobCount,
				pageCount: parseInt(Math.ceil(jobSeekerJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Your interview !!",
			count: jobSeekerJobCount,
			pageCount: parseInt(Math.ceil(jobSeekerJobCount / limit)),
			currentPage: parseInt(page),
			data: jobSeeker,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getInterviews2JobSeeker = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({
			applicantId: userId,
			shortlist: true,
			interviews: true,
			interviews2: true,
			selectedCandidates: { $in: [false, null] },
		})
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({
			applicantId: userId,
			shortlist: true,
			interviews: true,
			interviews2: true,
			selectedCandidates: { $in: [false, null] },
		});

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any interview 2 !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Your Interview 2 !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getSelectedCandidatesJobSeeker = async (req, res) => {
	try {
		const page = req.params.page >= 1 ? req.params.page : 1;
		const limit = req.params.limit >= 1 ? req.params.limit : 6;
		const skip = limit * (page - 1);
		const userId = req.user._id;

		const company = await JobApplication.find({ applicantId: userId, selectedCandidates: true })
			.limit(limit)
			.skip(skip)
			.sort({ createdAt: -1 })
			.populate("jobId")
			.populate("applierId", {
				name: 1,
				userType: 1,
				profileImage: 1,
			})
			.populate({
				path: "applicantId",
				select: "-email -phone -resume",
			})
			.lean();
		const companyJobCount = await JobApplication.countDocuments({ applicantId: userId, selectedCandidates: true });

		if (company.length === 0)
			return res.status(200).send({
				status: true,
				msg: "You don't have any selected jobs !!",
				count: companyJobCount,
				pageCount: parseInt(Math.ceil(companyJobCount / limit)),
				currentPage: parseInt(page),
				data: [],
			});

		return res.status(200).send({
			status: true,
			msg: "Your selected Jobs !!",
			count: companyJobCount,
			pageCount: parseInt(Math.ceil(companyJobCount / limit)),
			currentPage: parseInt(page),
			data: company,
		});
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.getInterviewsBySingleDate = async (req, res) => {
    try {
        const { date, hrId, interviewField } = req.query;

        let hrFilter = {};
        if (hrId) {
            // Validate HR ID
            if (!ObjectId.isValid(hrId)) {
                return res.status(400).json({ status: false, msg: "Invalid HR ObjectId" });
            }
            hrFilter = { _id: hrId };
        }

        // Find HR(s) based on the specified filter
        const hrList = await AdminUser.find(hrFilter, { userId: 1, type: 1, profileImage: 1, name: 1, _id: 1, jobTarget: 1 });
        // Initialize array to store interviews
        const allInterviews = [];

        // Iterate over each HR to fetch interviews
        for (const hr of hrList) {
            // Check if hr has jobTarget
            if (!hr.jobTarget) continue;

            // Find job applications related to the HR's job targets
            const jobApplications = await JobApplication.find({
                jobId: { $in: hr.jobTarget.flatMap((target) => target.jobIds.map((idObj) => idObj.jobId)) },
            }).populate("applicantId applierId jobId");

            // Filter job applications based on the provided date and interview field
            const interviewsBySingleDate = jobApplications.filter((application) => {
                let interviewPending;
                interviewPending =
                    application.interviewStatus &&
                    (application.interviewStatus["interview2Pending"] === false ||
                        application.interviewStatus["interviewPending"] === false);
                return interviewPending && application[`${interviewField}Date`] === date;
            });

            // Attach HR details to each interview
            const interviewsWithHRDetails = interviewsBySingleDate.map((interview) => {
                const interviewObj = interview.toObject ? interview.toObject() : interview;
                return {
                    ...interviewObj,
                    interview: interviewObj,
                    hrDetails: { userId: hr.userId, type: hr.type, profileImage: hr.profileImage, name: hr.name, _id: hr._id },
                };
            });

            // Push the interviews with HR details to the allInterviews array
            allInterviews.push(...interviewsWithHRDetails);
        }

        return res.status(200).json({
            status: true,
            msg: "Here are the listed employees with interviews on the specified date!",
            data: allInterviews,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, msg: error.message });
    }
};

jobApplication.getInterviewStats = async (req, res) => {
	try {
		const { hrId } = req.query;

		// Validate HR ID
		if (!ObjectId.isValid(hrId)) {
			return res.status(400).json({ status: false, msg: "Invalid HR ObjectId" });
		}

		// Find HR by ID
		const hr = await AdminUser.findById(hrId);
		if (!hr) {
			return res.status(404).json({ status: false, msg: "HR not found" });
		}

		// Find job applications related to the HR's job targets
		const jobApplications = await JobApplication.find({
			jobId: { $in: hr.jobTarget.flatMap((target) => target.jobIds.map((idObj) => idObj.jobId)) },
		});

		// Initialize counters for done and total
		let done = 0;
		let total = 0;

		// Calculate stats for each job application
		jobApplications.forEach((application) => {
			// Check if interviewStatus field is present
			if (application.interviewStatus) {
				// Check if interview is pending and timestamp1 is within 30 days
				if (application.interviewStatus.interviewPending && application.interviewStatus.timestamp1) {
					const timestamp1Date = new Date(application.interviewStatus.timestamp1);
					const thirtyDaysAgo = new Date();
					thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
					if (timestamp1Date >= thirtyDaysAgo) {
						done++;
					}
				}

				// Check if interview2 is pending and timestamp2 is within 30 days
				if (application.interviewStatus.interview2Pending && application.interviewStatus.timestamp2) {
					const timestamp2Date = new Date(application.interviewStatus.timestamp2);
					const thirtyDaysAgo = new Date();
					thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
					if (timestamp2Date >= thirtyDaysAgo) {
						done++;
					}
				}
			}

			// Check if interviewsDate or interviews2Date is less than 30 days earlier
			if (application.interviewsDate) {
				const interviewsDate = new Date(application.interviewsDate);
				const thirtyDaysAgo = new Date();
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				if (interviewsDate >= thirtyDaysAgo) {
					total++;
				}
			}
			if (application.interviews2Date) {
				const interviews2Date = new Date(application.interviews2Date);
				const thirtyDaysAgo = new Date();
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				if (interviews2Date >= thirtyDaysAgo) {
					total++;
				}
			}
		});

		let inProcess = total - done;
		return res.status(200).json({
			status: true,
			msg: "Interview stats calculated successfully!",
			data: {
				done,
				inProcess,
				total,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

jobApplication.getJobTargetsByMonthAndYear = async (req, res) => {
	try {
		const { hrId, year, filterYear } = req.query;
		const month = req.query.month.toLowerCase();

		// Validate HR ID
		if (!ObjectId.isValid(hrId)) return res.status(400).json({ status: false, msg: "Invalid HR ObjectId" });

		// Find HR by ID
		const hr = await AdminUser.findById(hrId);
		if (!hr) return res.status(404).json({ status: false, msg: "HR not found" });

		// Find job targets matching the provided month and year
		const jobTargets = hr.jobTarget.filter((target) => target.month.toLowerCase() === month && target.year === year);

		// If filterYear is provided, filter job targets by year
		let newData = [];
		if (filterYear) {
			newData = hr.jobTarget.filter((target) => target.year === filterYear);

			// Exclude months that are already included in data
			if (year === filterYear) {
				newData = newData.filter(
					(target) => !jobTargets.some((t) => t.month.toLowerCase() === target.month.toLowerCase())
				);
			}
		}

		// If job targets exist for the provided month and year, return jobsDone, jobsTarget, and populate jobIds field
		let data = [];
		if (jobTargets.length > 0) {
			const jobIds = jobTargets.flatMap((target) => target.jobIds.map((idObj) => idObj.jobId));

			// Find jobs based on jobIds
			const jobs = await Job.find({ _id: { $in: jobIds } });

			data = jobTargets.map((target) => ({
				month: target.month.toLowerCase(),
				year: target.year,
				jobsDone: target.jobsDone,
				jobsTarget: target.jobsTarget,
				jobIds: target.jobIds,
			}));
		}

		data = jobTargets?.[0] ? jobTargets?.[0] : [];

		return res.status(200).json({
			status: true,
			msg: "Job targets found",
			data,
			newData: newData,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

jobApplication.getMonthJobHR = async (req, res) => {
	const { adminId, process, serviceType, page = 1, limit = 10, monthId } = req.query;

	try {
		// Find the admin user by adminId
		const adminUser = await AdminUser.findById(adminId);
		if (!adminUser) {
			return res.status(404).json({ status: false, msg: "Admin not found" });
		}

		// Filter job targets based on the provided process filter and monthId
		let filteredJobTargets = adminUser.jobTarget.filter(
			(target) => target._id.toString() === monthId && target.jobIds.some((job) => job.process === process)
		);

		// Extract job IDs from the filtered job targets
		const jobIds = filteredJobTargets.flatMap((target) => target.jobIds.map((job) => job.jobId));

		// Find jobs based on job IDs, serviceType filter, and in descending order of date
		const jobsQuery = Job.find({
			_id: { $in: jobIds },
			serviceType: serviceType, // Filter based on serviceType
		}).sort("-createdAt");

		// Apply pagination
		const skip = (page - 1) * limit;
		jobsQuery.skip(skip).limit(Number(limit));

		// Fetch the jobs
		const jobs = await jobsQuery.exec();

		// Fetch the number of job applications for each job
		const applicationCounts = await JobApplication.aggregate([
			{
				$match: {
					jobId: {
						$in: jobIds,
					},
				},
			},
			{
				$group: {
					_id: "$jobId",
					count: { $sum: 1 },
					applicants: { $addToSet: "$applicantId" }, // Aggregate all applicantIds
				},
			},
		]);

		// Create a map to store application counts and applicantIds by job ID
		const applicationInfoMap = {};
		applicationCounts.forEach((appCount) => {
			applicationInfoMap[appCount?._id?.toString()] = {
				count: appCount?.count,
				applicants: appCount?.applicants,
			};
		});

		// Fetch additional statistics for each job
		const jobsWithStatistics = await Promise.all(
			jobs.map(async (job) => {
				// Fetch job applications for the job ID
				const jobApplications = await JobApplication.find({ jobId: job._id });

				// Calculate statistics for the job
				let interviewScheduled = 0;
				let interviewTaken = 0;
				let totalSelectedCandidates = 0;

				jobApplications.forEach((application) => {
					if (application.interviews || application.interviews2) {
						interviewScheduled++;
					}

					if (application.interviewStatus) {
						const { interviewPending, interview2Pending } = application.interviewStatus;

						if (interviewPending === false && interview2Pending === false) {
							interviewTaken++;
						}
					}

					if (application.selectedCandidates) {
						totalSelectedCandidates++;
					}
				});

				if (job._id.toString()) applicantIds = applicationInfoMap[job._id.toString()]?.applicants || [];
				const profileImages = await getProfileImages(applicantIds);
				// Return job details with statistics and applicantIds
				return {
					...job.toObject(),
					applicationCount: applicationInfoMap[job._id.toString()]?.count || 0,
					interviewScheduled,
					interviewTaken,
					totalSelectedCandidates,
					profileImages, // Include applicantIds
				};
			})
		);

		// Return the jobs with application counts, statistics, and applicantIds as JSON response
		res.json({
			status: true,
			page: Number(page),
			count: jobsWithStatistics.length,
			data: jobsWithStatistics,
			msg: "Assign Job data fetch successfully !!",
		});
	} catch (error) {
		console.error("Error fetching admin jobs:", error);
		res.status(500).json({ status: false, msg: error.message });
	}
};

jobApplication.adminShortlist = async (req, res, io) => {
	try {
		const application = await JobApplication.findOne({ _id: req.params._id });
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const updatedApplication = await JobApplication.findByIdAndUpdate(application._id, { shortlist: true, pipelineStatus: "Shortlisted" }, { new: true })
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		await User.findByIdAndUpdate(application.applicantId, { status: "Shortlisted", response: "Shortlisted" });

		const data = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You are shortlisted for ${updatedApplication.jobId.jobTittle} job by Admin`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `Admin shortlisted ${
				updatedApplication.applicantId.name === "" ? "Someone" : updatedApplication.applicantId.name
			} for ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for shortlist from Admin Side !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.doInterviewSelectAdminSide = async (req, res, io) => {
	try {
		if (!req.body.interviewsDate)
			return res.status(404).send({ status: true, msg: "Please provide a interview date !!", data: [] });
		if (!req.body.interviewsTime)
			return res.status(404).send({ status: true, msg: "Please provide a interview time !!", data: [] });

		const time = convertTo12HourFormat(req.body.interviewsTime);

		const application = await JobApplication.findOne({ _id: req.params._id })
			.populate("jobId")
			.populate("applicantId")
			.populate("applierId");
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const meetLink = await createMeetLink({
			candidateEmail: application.applicantId?.email,
			candidateName: application.applicantId?.name,
			companyName: application.jobId?.companyName,
			jobTitle: application.jobId?.jobTittle,
			date: req.body.interviewsDate,
			time: time,
			adminEmail: req.user?.email,
			recruiterEmail: application.applierId?.email,
		});

		const updatedApplication = await JobApplication.findByIdAndUpdate(
			application._id,
			{
				interviews: true,
				interviewsDate: req.body.interviewsDate,
				interviewsTime: time,
				interviewExtras: meetLink || "",
				pipelineStatus: "Interview 1",
			},
			{ new: true }
		)
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		await User.findByIdAndUpdate(application.applicantId, { status: "Interview 1", response: "Interview 1" });

		const hrAdmin = await adminUserModel.findOne({ "jobTarget.jobIds.jobId": application.jobId });
		if (hrAdmin) {
			hrAdmin.interviewScheduled += 1;
			await hrAdmin.save();
		}

		const data = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You are selected for interview for the ${updatedApplication.jobId.jobTittle} job by Admin on ${updatedApplication.interviewsDate} at ${updatedApplication.interviewsTime}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `Admin scheduled first round of interview with ${updatedApplication.applicantId.name} for ${updatedApplication.jobId.jobTittle} job on ${updatedApplication.interviewsDate} at ${updatedApplication.interviewsTime}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for interview from Admin Side!!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.doInterview2SelectAdminSide = async (req, res, io) => {
	try {
		if (!req.body.interviews2Date)
			return res.status(404).send({ status: true, msg: "Please provide a interview date !!", data: [] });
		if (!req.body.interviews2Time)
			return res.status(404).send({ status: true, msg: "Please provide a interview time !!", data: [] });

		const time = convertTo12HourFormat(req.body.interviews2Time);
		const application = await JobApplication.findOne({ _id: req.params._id })
			.populate("jobId")
			.populate("applicantId")
			.populate("applierId");
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const meetLink = await createMeetLink({
			candidateEmail: application.applicantId?.email,
			candidateName: application.applicantId?.name,
			companyName: application.jobId?.companyName,
			jobTitle: application.jobId?.jobTittle,
			date: req.body.interviews2Date,
			time: time,
			adminEmail: req.user?.email,
			recruiterEmail: application.applierId?.email,
		});

		const updatedApplication = await JobApplication.findByIdAndUpdate(
			application._id,
			{
				interviews2: true,
				interviews2Date: req.body.interviews2Date,
				interviews2Time: time,
				interviewExtras: meetLink || "",
				pipelineStatus: "Interview 2",
			},
			{ new: true }
		)
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		await User.findByIdAndUpdate(application.applicantId, { status: "Interview 2", response: "Interview 2" });

		const hrAdmin = await adminUserModel.findOne({ "jobTarget.jobIds.jobId": application.jobId });
		if (hrAdmin) {
			hrAdmin.interviewScheduled += 1;
			await hrAdmin.save();
		}

		const data = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You are selected for a second round of interviews for the ${updatedApplication.jobId.jobTittle} job by Admin on ${req.body.interviews2Date} at ${updatedApplication.interviews2Time}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `Admin scheduled second round of interview with ${updatedApplication.applicantId.name} for ${updatedApplication.jobId.jobTittle} job on ${updatedApplication.interviews2Date} at ${updatedApplication.interviews2Time}`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "Application updated for interview 2 from Admin Side !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

jobApplication.selectedAdminSide = async (req, res, io) => {
	try {
		const offerLetterDate = req.body.offerLetterDate;
		const offerLetterTime = convertTo12HourFormat(req.body.offerLetterTime);

		const application = await JobApplication.findOne({ _id: req.params._id });
		if (!application) return res.status(404).send({ status: false, msg: "No application found !!" });

		const findUser = await User.findOne({ _id: application.applicantId });
		if (findUser) {
			findUser.isHired = true;
			findUser.status = "Selected";
			findUser.response = "Selected";
			findUser.selectedBadge = true;
			if (!findUser.selectedIn.some(item => item.job && item.job.toString() === application.jobId.toString())) {
				findUser.selectedIn.push({ job: application.jobId, date: new Date() });
			}
			await findUser.save();
		}

		const updatedApplication = await JobApplication.findByIdAndUpdate(
			application._id,
			{ selectedCandidates: true, offerLetterDate, offerLetterTime, pipelineStatus: "Selected" },
			{ new: true }
		)
			.populate("jobId")
			.populate({ path: "applierId", select: "name userType profileImage" })
			.populate({ path: "applicantId", select: "name userType profileImage isHired" });

		const jobId = application.jobId;

		const adminUsers = await adminUserModel.find();
		for (const adminUser of adminUsers) {
			if (adminUser.type === "superAdmin") continue;
			for (const monthJob of adminUser.jobTarget) {
				if (monthJob.jobIds.find(job => job.jobId.equals(jobId))) {
					monthJob.jobsDone += 1;
					adminUser.totalHired += 1;
					break;
				}
			}
			await adminUser.save();
		}

		const data = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applicantId,
			title: `${updatedApplication.jobId.companyName}`,
			desc: `You have been selected for the ${updatedApplication.jobId.jobTittle} job by Admin`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data.receiverId._id}`, data);

		const data2 = await createNotification({
			senderType: "adminUser",
			senderId: req.user._id,
			receiverId: updatedApplication.applierId,
			title: `${updatedApplication.jobId.jobTittle}`,
			desc: `Admin selected candidate ${updatedApplication.applicantId.name} for your ${updatedApplication.jobId.jobTittle} job`,
			logo: updatedApplication.jobId.companyLogo,
		});
		io.emit(`notifications_${data2.receiverId._id}`, data2);

		return res.status(200).send({ status: true, msg: "You selected this candidate !!", data: updatedApplication });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

/**
 * PUT /jobApplication/pipeline-status/:applicationId
 * Body: { status }
 * Updates the pipelineStatus of a specific JobApplication (per-job per-candidate)
 */
jobApplication.updatePipelineStatus = async (req, res) => {
	try {
		const { applicationId } = req.params;
		const { status, date, time } = req.body;

		const VALID_STATUSES = ["Applied", "Shortlisted", "Interview 1", "Interview 2", "Selected", "Rejected"];

		if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
			return res.status(400).json({ status: false, msg: "Invalid application ID" });
		}

		if (!status || !VALID_STATUSES.includes(status)) {
			return res.status(400).json({
				status: false,
				msg: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
			});
		}

		// Prepare update object to keep all boolean fields in sync with the selected stage
		const updateData = { pipelineStatus: status };

		switch (status) {
			case "Applied":
				updateData.shortlist = false;
				updateData.interviews = false;
				updateData.interviews2 = false;
				updateData.selectedCandidates = null;
				break;
			case "Shortlisted":
				updateData.shortlist = true;
				updateData.interviews = false;
				updateData.interviews2 = false;
				updateData.selectedCandidates = null;
				break;
			case "Interview 1":
				updateData.shortlist = true;
				updateData.interviews = true;
				updateData.interviews2 = false;
				updateData.selectedCandidates = null;

				// Fetch application to check if date is already set (or if we are overriding it)
				const existingApp = await JobApplication.findById(applicationId);
				if (existingApp && (!existingApp.interviewsDate || date || time)) {
					const tomorrow = new Date();
					tomorrow.setDate(tomorrow.getDate() + 1);
					const dateStr = date || tomorrow.toISOString().split("T")[0];
					const timeStr = time ? convertTo12HourFormat(time) : "11:00 AM";

					updateData.interviewsDate = dateStr;
					updateData.interviewsTime = timeStr;

					try {
						const populatedApp = await JobApplication.findById(applicationId)
							.populate("jobId")
							.populate("applicantId")
							.populate("applierId");
						
						const meetLink = await createMeetLink({
							candidateEmail: populatedApp.applicantId?.email,
							candidateName: populatedApp.applicantId?.name,
							companyName: populatedApp.jobId?.companyName,
							jobTitle: populatedApp.jobId?.jobTittle,
							date: dateStr,
							time: timeStr,
							adminEmail: req.user?.email,
							recruiterEmail: populatedApp.applierId?.email,
						});

						if (meetLink) {
							updateData.interviewExtras = meetLink;
						}
					} catch (meetErr) {
						console.error("Auto Meet link generation failed:", meetErr);
					}
				}
				break;
			case "Interview 2":
				updateData.shortlist = true;
				updateData.interviews = true;
				updateData.interviews2 = true;
				updateData.selectedCandidates = null;

				const existingApp2 = await JobApplication.findById(applicationId);
				if (existingApp2 && (!existingApp2.interviews2Date || date || time)) {
					const dayAfterTomorrow = new Date();
					dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
					const dateStr = date || dayAfterTomorrow.toISOString().split("T")[0];
					const timeStr = time ? convertTo12HourFormat(time) : "11:00 AM";

					updateData.interviews2Date = dateStr;
					updateData.interviews2Time = timeStr;

					try {
						const populatedApp = await JobApplication.findById(applicationId)
							.populate("jobId")
							.populate("applicantId")
							.populate("applierId");
						
						const meetLink = await createMeetLink({
							candidateEmail: populatedApp.applicantId?.email,
							candidateName: populatedApp.applicantId?.name,
							companyName: populatedApp.jobId?.companyName,
							jobTitle: populatedApp.jobId?.jobTittle,
							date: dateStr,
							time: timeStr,
							adminEmail: req.user?.email,
							recruiterEmail: populatedApp.applierId?.email,
						});

						if (meetLink) {
							updateData.interviewExtras = meetLink;
						}
					} catch (meetErr) {
						console.error("Auto Meet link generation failed:", meetErr);
					}
				}
				break;
			case "Selected":
				updateData.shortlist = true;
				updateData.interviews = true;
				updateData.interviews2 = true;
				updateData.selectedCandidates = true;

				const existingAppSel = await JobApplication.findById(applicationId);
				if (existingAppSel && (!existingAppSel.offerLetterDate || date || time)) {
					updateData.offerLetterDate = date || new Date().toISOString().split("T")[0];
					updateData.offerLetterTime = time ? convertTo12HourFormat(time) : "12:00 PM";
				}
				break;
			case "Rejected":
				updateData.selectedCandidates = false;
				break;
		}

		const application = await JobApplication.findByIdAndUpdate(
			applicationId,
			{ $set: updateData },
			{ new: true }
		);

		if (!application) {
			return res.status(404).json({ status: false, msg: "Job application not found" });
		}

		// Sync User-level global selectedBadge and selectedIn history
		try {
			if (status === "Selected") {
				// Mark as selected globally, add to selectedIn history (using $addToSet or push unique)
				await User.findByIdAndUpdate(application.applicantId, {
					$set: { selectedBadge: true },
					$addToSet: { selectedIn: { job: application.jobId } }
				});
			} else {
				// If transitioned away from Selected, check if they have any other active Selected jobs
				const otherSelectedCount = await JobApplication.countDocuments({
					_id: { $ne: applicationId },
					applicantId: application.applicantId,
					pipelineStatus: "Selected"
				});
				if (otherSelectedCount === 0) {
					await User.findByIdAndUpdate(application.applicantId, {
						$set: { selectedBadge: false },
						$pull: { selectedIn: { job: application.jobId } }
					});
				} else {
					// If they are still selected in another job, just remove this specific job from active list
					await User.findByIdAndUpdate(application.applicantId, {
						$pull: { selectedIn: { job: application.jobId } }
					});
				}
			}
		} catch (dbErr) {
			console.error("Failed to sync user-level selection flags:", dbErr);
		}

		return res.status(200).json({
			status: true,
			msg: `Pipeline status updated to "${status}"`,
			pipelineStatus: application.pipelineStatus,
			applicationId: application._id,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: error.message });
	}
};

module.exports = jobApplication;
