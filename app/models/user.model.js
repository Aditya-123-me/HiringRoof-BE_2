const mongoose = require("mongoose");



const userSchema = mongoose.Schema(
	{
		phone: { type: String, unique: true },
		alternativePhone: { type: String, default: "" },
		alternativePhone2: { type: String, default: "" },
		address: { type: String, default: "" },
		userType: {
			type: String,
			default: "jobSeeker",
			enum: ["jobSeeker", "individualRecruiter", "companyRecruiter", "company", "recruiter"],
		},
		otp: { type: Number, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
		profileImage: {
			type: String,
			default: "",
		},
		location: { type: String, default: "" },
		gender: { type: String, default: "" },
		dob: { type: String, default: "" },
		profileComplete: { type: Number, default: 0 },
		about: { type: String, default: "" },
		//user
		profession: { type: String, default: "" },
		videoUrl: { type: String, default: "" },
		currentPay: { type: String, default: "" },
		expectationPay: { type: String, default: "" },
		skillSubCategories: { type: [String] },
		skills: { type: [String] },
		skillDetails: [
			{
				main: { type: String },
				sub: { type: String },
				skills: { type: [String] },
			},
		],
		experience: { type: String, default: "" },
		resume: { type: String, default: "" },
		resumeFileName: { type: String, default: "" },
		resumeSize: { type: String, default: "" },
		resumePages: { type: Number, default: 0 },
		letter: { type: String, default: "" },
		letterFileName: { type: String, default: "" },
		letterSize: { type: String, default: "" },
		letterPages: { type: Number, default: 0 },
		isHired: { type: Boolean, default: false },
		projects: [
			{
				projectName: { type: String, default: "" },
				desc: { type: String, default: "" },
				startTime: { type: String, default: "" },
				endTime: { type: String, default: "" },
			},
		],
		education: [
			{
				name: { type: String, default: "" },
				desc: { type: String, default: "" },
				startTime: { type: String, default: "" },
				endTime: { type: String, default: "" },
			},
		],
		//company
		companyName: { type: String, default: "" },
		aboutCompany: { type: String, default: "" },
		companyLogo: {
			type: String,
			default:
				"https://lh3.googleusercontent.com/d/1ybpi3L_-XDjHyZmiyIjg-ZZ5S-1jk3MU",
		},
		companyType: { type: String, default: "" },
		companyEmail: { type: String, default: "" },
		companyPhone: { type: String, default: "" },
		companyAlternativePhone: { type: String, default: "" },
		totalJobs: { type: Number, default: 0 },
		totalHired: { type: Number, default: 0 },
		blocked: {
			reason: { type: String, default: "" },
			date: { type: Date, default: "" },
			blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", default: null },
		},
		blocked_status: { type: Boolean, default: false },
		isDeleted: { type: Boolean, default: false },
		deletedAt: { type: Date, default: null },
		deletedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
		deleteType: { type: String, enum: ["soft", "hard", ""], default: "" },
		deleteReason: { type: String, default: "" },
		entryDate: { type: String, default: "" },
		immediateJoiner: { type: String, default: "" },
		lastQualification: { type: String, default: "" },
		passoutYear: { type: String, default: "" },
		experience: { type: String, default: "" },
		withoutContactResume: { type: String, default: "" },
		response: { type: String, default: "" },
		status: { type: String, default: "Applied", enum: ["Applied", "Shortlisted", "Interview 1", "Interview 2", "Selected", "Rejected"] },
		badge: { type: String, default: "" }, // superAdmin-assigned badge label
		wfo: { type: String, default: "" },
		interested: { type: String, default: "" },
		callBy: { type: String, default: "" },
		feedback: { type: String, default: "" },
		source: { type: String, default: "" },
		registrationSource: { type: String, default: "self", enum: ["self", "bulk"] },
		selectedBadge:
		{
			type:Boolean,
			default:false
		}, 
		selectedIn:[{
			job:{type: mongoose.Schema.Types.ObjectId, ref: "jobs", default: null},
			date:{
				type:Date,
				default:Date.now
			}
		}],
		selectionCount: {
			type: Number,
			default: 0
		},
		badgeRemovedCount: {
			type: Number,
			default: 0
		},
		statusAnalytics: {
			Applied: { type: Number, default: 0 },
			Shortlisted: { type: Number, default: 0 },
			"Interview 1": { type: Number, default: 0 },
			"Interview 2": { type: Number, default: 0 },
			Selected: { type: Number, default: 0 },
			Rejected: { type: Number, default: 0 },
			dropOffFromApplied: { type: Number, default: 0 },
			dropOffFromShortlisted: { type: Number, default: 0 },
			dropOffFromInterview1: { type: Number, default: 0 },
			dropOffFromInterview2: { type: Number, default: 0 }
		},
		uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "adminUser", default: null },
	},
	{ timestamps: true }
);

userSchema.pre("save", function (next) {
	try {
		if (this.userType === "company") this.userType = "companyRecruiter";
		if (this.userType === "recruiter") this.userType = "individualRecruiter";
		const { calculateProfileComplete } = require("../util/normalizeCandidateData");
		this.profileComplete = calculateProfileComplete(this);
	} catch (e) {
		console.error("Error in user pre-save profileComplete calculation:", e);
	}
	next();
});

module.exports = mongoose.model("users", userSchema);

