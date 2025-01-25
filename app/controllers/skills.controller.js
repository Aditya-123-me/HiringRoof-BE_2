const skillsModel = require("../models/skills.model");

const skills = {};

skills.one = async (req, res, io) => {
	try {
		const { mainCategory } = req.query;

		if (!mainCategory) {
			return res.status(400).json({ status: false, message: "Main category parameter is required" });
		}

		const skill = await skillsModel.findOne({ mainCategory });

		if (!skill) {
			return res.status(404).json({ status: false, message: "Main category not found" });
		}

		const subcategories = [];
		skill.subcategories.forEach((subCategory) => {
			subcategories.push({
				name: subCategory.name,
				skills: subCategory.skills,
			});
		});

		return res.status(200).json({
			status: true,
			data: { mainCategory: skill.mainCategory, subcategories },
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: "Internal server error" });
	}
};

skills.getAll = async (req, res, io) => {
	try {
		const skills = await skillsModel.find();

		const mainCategories = [];
		const subcategories = [];
		const allSkills = [];

		skills.forEach((skillDocument) => {
			mainCategories.push(skillDocument.mainCategory);

			for (const subCategory of skillDocument.subcategories.values()) {
				subcategories.push({
					mainCategory: skillDocument.mainCategory,
					subCategory: subCategory.name,
				});

				allSkills.push({
					mainCategory: skillDocument.mainCategory,
					subCategory: subCategory.name,
					skills: subCategory.skills,
				});
			}
		});

		const uniqueMainCategories = [...new Set(mainCategories)];
		const uniqueSubcategories = [...new Set(subcategories.map(JSON.stringify))].map(JSON.parse);

		return res.status(200).json({
			status: true,
			data: {
				mainCategories: uniqueMainCategories,
				subcategories: uniqueSubcategories,
				allSkills,
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: "Internal server error" });
	}
};

skills.create = async (req, res, io) => {
	try {
		const { mainCategory, subCategory, skills } = req.body;

		if (!Array.isArray(skills)) {
			return res.status(400).json({ status: false, message: "Skills array is required" });
		}

		let skill = await skillsModel.findOne({ mainCategory });

		if (!skill) {
			skill = new skillsModel({ mainCategory });
		}

		if (!skill.subcategories.has(subCategory)) {
			skill.subcategories.set(subCategory, { name: subCategory, skills: [] });
		}

		const subcategory = skill.subcategories.get(subCategory);
		skills.forEach((skillName) => {
			if (!subcategory.skills.includes(skillName)) {
				subcategory.skills.push(skillName);
			}
		});

		await skill.save();

		return res.status(200).json({ status: true, message: "Skills added successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: "Internal server error" });
	}
};

skills.delete = async (req, res, io) => {
	try {
		const { mainCategory, subCategory, skill } = req.body;

		let skillDocument = await skillsModel.findOne({ mainCategory });

		if (!skillDocument) {
			return res.status(404).json({ status: false, message: "Main category not found" });
		}

		const subcategory = skillDocument.subcategories.get(subCategory);
		if (!subcategory) {
			return res.status(404).json({ status: false, message: "Subcategory not found" });
		}

		const index = subcategory.skills.indexOf(skill);
		if (index === -1) {
			return res.status(404).json({ status: false, message: "Skill not found in the subcategory" });
		}

		subcategory.skills.splice(index, 1);

		await skillDocument.save();

		return res.status(200).json({ status: true, message: "Skill deleted successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: "Internal server error" });
	}
};

module.exports = skills;
