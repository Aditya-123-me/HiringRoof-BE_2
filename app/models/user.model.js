const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
	{
		phone: { type: String, unique: true },
		alternativePhone: { type: String, default: "" },
		alternativePhone2: { type: String, default: "" },
		address: { type: String, default: "" },
		userType: {
			type: String,
			required: true,
			default: "jobSeeker",
			enum: ["jobSeeker", "individualRecruiter", "companyRecruiter"],
		},
		otp: { type: Number, default: "" },
		name: { type: String, default: "" },
		email: { type: String, default: "" },
		profileImage: {
			type: String,
			default:
				"https://lh3.googleusercontent.com/d/1-3u9kwWOedcucn4Goqq-SXdXq8FlNRUl",
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
		entryDate: { type: String, default: "" },
		immediateJoiner: { type: String, default: "" },
		lastQualification: { type: String, default: "" },
		passoutYear: { type: String, default: "" },
		experience: { type: String, default: "" },
		withoutContactResume: { type: String, default: "" },
		response: { type: String, default: "" },
		wfo: { type: String, default: "" },
		interested: { type: String, default: "" },
		callBy: { type: String, default: "" },
		feedback: { type: String, default: "" },
		source: { type: String, default: "" },
		registrationSource: { type: String, default: "self", enum: ["self", "bulk"] },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("users", userSchema);
