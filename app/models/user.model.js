const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
	{
		phone: { type: String, unique: true },
		alternativePhone: { type: String, default: "" },
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
				"https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FAvtar.png?alt=media&token=5a84bf05-8bec-4f7b-b9f3-deb8205b8cef",
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
		letter: { type: String, default: "" },
		letterFileName: { type: String, default: "" },
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
				"https://firebasestorage.googleapis.com/v0/b/hiringroof.appspot.com/o/static%20data%2FLogo.png?alt=media&token=fa7905e6-11ec-4352-af07-a1fbc200e5d8",
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
	},
	{ timestamps: true }
);

module.exports = mongoose.model("users", userSchema);
