const mongoose = require("mongoose");

const campusJobSchema = mongoose.Schema(
	{
		company_id: { type: mongoose.Schema.Types.ObjectId, ref: "campusRecruiters", required: true, index: true },
		role_category: { type: String, required: [true, "Role category is required"], trim: true },
		position_title: { type: String, required: [true, "Position title is required"], trim: true },
		package_range: { type: String, required: [true, "Package range is required"], trim: true },
		openings_count: { type: Number, required: [true, "Openings count is required"], min: [1, "Openings count must be at least 1"] },
		location: { type: String, required: [true, "Location is required"], trim: true },
		min_cgpa: { type: Number, required: [true, "Minimum CGPA is required"], min: [0, "Minimum CGPA cannot be less than 0"], max: [10, "Minimum CGPA cannot be more than 10"] },
		eligible_degrees: {
			type: [String],
			required: [true, "Eligible degrees are required"],
			validate: [(value) => Array.isArray(value) && value.filter(Boolean).length > 0, "Eligible degrees must contain at least one value"],
		},
		mandatory_skills: {
			type: [String],
			required: [true, "Mandatory skills are required"],
			validate: [(value) => Array.isArray(value) && value.filter(Boolean).length > 0, "Mandatory skills must contain at least one value"],
		},
		nominated_students: { type: [mongoose.Schema.Types.ObjectId], ref: "campusStudents", default: [] },
		status: { type: String, enum: ["Published", "Closed"], default: "Published" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("campusJobs", campusJobSchema);
