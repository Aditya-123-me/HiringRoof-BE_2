const mongoose = require("mongoose");

// 1. College & University Registration Model
const collegeSchema = new mongoose.Schema(
	{
		collegeName: { type: String, required: true },
		university: { type: String, required: true },
		collegeCode: { type: String, default: "" },
		state: { type: String, required: true },
		city: { type: String, required: true },
		address: { type: String, default: "" },
		nirfRank: { type: String, default: "" },
		accreditation: { type: String, default: "" }, // NAAC A++, NBA, etc.
		placementOfficerName: { type: String, required: true },
		placementOfficerEmail: { type: String, required: true },
		placementOfficerPhone: { type: String, required: true },
		altContact: { type: String, default: "" },
		website: { type: String, default: "" },
		brochureUrl: { type: String, default: "" },
		status: { type: String, enum: ["pending", "verified", "active"], default: "verified" },
		totalStudents: { type: Number, default: 0 },
		activeDrives: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

// 2. Company Campus Registration Model
const companySchema = new mongoose.Schema(
	{
		companyName: { type: String, required: true },
		industry: { type: String, required: true },
		website: { type: String, default: "" },
		location: { type: String, required: true },
		hrLeadName: { type: String, required: true },
		hrEmail: { type: String, required: true },
		hrPhone: { type: String, required: true },
		expectedHires: { type: Number, default: 10 },
		targetCourses: { type: [String], default: [] },
		avgPackage: { type: String, default: "" },
		description: { type: String, default: "" },
		status: { type: String, enum: ["pending", "verified", "active"], default: "verified" },
		logo: { type: String, default: "" },
	},
	{ timestamps: true }
);

// 3. Student Details Model
const studentSchema = new mongoose.Schema(
	{
		fullName: { type: String, required: true },
		email: { type: String, required: true },
		phone: { type: String, required: true },
		collegeName: { type: String, required: true },
		university: { type: String, default: "" },
		rollNo: { type: String, default: "" },
		course: { type: String, required: true }, // B.Tech, BCA, MCA, MBA, B.Sc, M.Tech, etc.
		department: { type: String, required: true }, // CSE, IT, ECE, Mechanical, Finance, etc.
		graduationYear: { type: Number, required: true }, // 2024, 2025, 2026, 2027
		cgpa: { type: Number, required: true },
		skills: { type: [String], default: [] },
		location: { type: String, default: "" },
		resumeUrl: { type: String, default: "" },
		placementStatus: {
			type: String,
			enum: ["Not Placed", "Applied", "Shortlisted", "Assessment", "Interview Scheduled", "Selected", "Placed"],
			default: "Not Placed",
		},
		placedCompany: { type: String, default: "" },
		packageOffered: { type: String, default: "" },
	},
	{ timestamps: true }
);

// 4. Company Campus Hiring Requirements Model
const requirementSchema = new mongoose.Schema(
	{
		companyName: { type: String, required: true },
		companyId: { type: mongoose.Schema.Types.ObjectId, ref: "campus_companies", default: null },
		title: { type: String, required: true },
		jobRole: { type: String, required: true },
		description: { type: String, default: "" },
		eligibleCourses: { type: [String], default: [] },
		targetGraduationYears: { type: [Number], default: [] },
		minCgpa: { type: Number, default: 6.0 },
		requiredSkills: { type: [String], default: [] },
		workLocation: { type: String, required: true },
		jobType: { type: String, enum: ["Full Time", "Internship", "Intern + PPO"], default: "Full Time" },
		ctcOrStipend: { type: String, required: true },
		openings: { type: Number, default: 5 },
		deadline: { type: Date },
		status: { type: String, enum: ["Open", "In Review", "Closed"], default: "Open" },
		applicantsCount: { type: Number, default: 0 },
		applicants: [
			{
				studentId: { type: mongoose.Schema.Types.ObjectId, ref: "campus_students", default: null },
				studentName: { type: String, default: "" },
				studentEmail: { type: String, default: "" },
				appliedAt: { type: Date, default: Date.now },
			},
		],
	},
	{ timestamps: true }
);

// 5. Campus Placement & Recruitment Drive Model
const driveSchema = new mongoose.Schema(
	{
		driveTitle: { type: String, required: true },
		companyName: { type: String, required: true },
		collegeName: { type: String, required: true },
		driveType: { type: String, enum: ["On-Campus", "Virtual", "Pool Campus"], default: "On-Campus" },
		driveDate: { type: Date, required: true },
		venueOrLink: { type: String, default: "" },
		rolesOffered: { type: [String], default: [] },
		packageRange: { type: String, default: "" },
		rounds: { type: [String], default: ["Online Aptitude", "Technical Interview", "HR Discussion"] },
		status: { type: String, enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"], default: "Upcoming" },
		registeredStudentsCount: { type: Number, default: 0 },
		selectedStudentsCount: { type: Number, default: 0 },
		registeredStudents: [
			{
				studentId: { type: mongoose.Schema.Types.ObjectId, ref: "campus_students", default: null },
				studentName: { type: String, default: "" },
				studentEmail: { type: String, default: "" },
				registeredAt: { type: Date, default: Date.now },
			},
		],
		instructions: { type: String, default: "" },
	},
	{ timestamps: true }
);

// 6. Interview Scheduling & Candidate Status Tracking Model
const interviewSchema = new mongoose.Schema(
	{
		candidateName: { type: String, required: true },
		candidateEmail: { type: String, required: true },
		candidatePhone: { type: String, default: "" },
		studentId: { type: mongoose.Schema.Types.ObjectId, ref: "campus_students", default: null },
		collegeName: { type: String, required: true },
		companyName: { type: String, required: true },
		role: { type: String, required: true },
		interviewRound: { type: String, default: "Technical Round 1" },
		scheduledDate: { type: Date, required: true },
		timeSlot: { type: String, required: true }, // e.g. "11:00 AM - 11:45 AM"
		mode: { type: String, enum: ["Online (Google Meet / Zoom)", "In-Person (Campus Block A)"], default: "Online (Google Meet / Zoom)" },
		meetingLinkOrVenue: { type: String, default: "" },
		interviewerName: { type: String, default: "Campus Technical Panel" },
		status: {
			type: String,
			enum: ["Scheduled", "In Progress", "Shortlisted", "Rejected", "Selected", "Offer Extended"],
			default: "Scheduled",
		},
		feedback: { type: String, default: "" },
	},
	{ timestamps: true }
);

const CampusCollege = mongoose.model("campus_colleges", collegeSchema);
const CampusCompany = mongoose.model("campus_companies", companySchema);
const CampusStudent = mongoose.model("campus_students", studentSchema);
const CampusRequirement = mongoose.model("campus_requirements", requirementSchema);
const CampusDrive = mongoose.model("campus_drives", driveSchema);
const CampusInterview = mongoose.model("campus_interviews", interviewSchema);

module.exports = {
	CampusCollege,
	CampusCompany,
	CampusStudent,
	CampusRequirement,
	CampusDrive,
	CampusInterview,
};
