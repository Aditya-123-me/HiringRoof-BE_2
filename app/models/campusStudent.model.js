const mongoose = require("mongoose");

const campusStudentSchema = mongoose.Schema(
	{
		collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "colleges", required: true, index: true },
		name: { type: String, required: [true, "Student name is required"], trim: true },
		email: { type: String, default: "", trim: true, lowercase: true },
		phone: { type: String, default: "", trim: true },
		rollNumber: { type: String, default: "", trim: true },
		degree: { type: String, default: "", trim: true },
		branch: { type: String, default: "", trim: true },
		passoutYear: { type: String, default: "", trim: true },
		cgpa: { type: String, default: "", trim: true },
		gender: { type: String, default: "", trim: true },
		dob: { type: String, default: "", trim: true },
		location: { type: String, default: "", trim: true },
		skills: { type: [String], default: [] },
		resume: { type: String, default: "" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("campusStudents", campusStudentSchema);
