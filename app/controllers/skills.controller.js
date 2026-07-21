const skillsModel = require("../models/skills.model");

const skills = {};

skills.one = async (req, res, io) => {
	try {
		const { mainCategory } = req.query;

		if (!mainCategory) {
			const skillsDocuments = await skillsModel.find();
			const flatSkills = [];
			skillsDocuments.forEach((doc) => {
				if (doc.subcategories) {
					for (const subCat of doc.subcategories.values()) {
						if (Array.isArray(subCat.skills)) flatSkills.push(...subCat.skills);
					}
				}
			});
			const uniqueSkills = [...new Set(flatSkills)];
			return res.status(200).json({ status: true, skills: uniqueSkills, data: uniqueSkills });
		}

		const skill = await skillsModel.findOne({ mainCategory });

		if (!skill) {
			return res.status(404).json({ status: false, message: "Main category not found" });
		}

		/*
		// OLD IMPLEMENTATION
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
		*/

		const flatSkills = [];
		if (skill.subcategories) {
			for (const subCat of skill.subcategories.values()) {
				if (Array.isArray(subCat.skills)) flatSkills.push(...subCat.skills);
			}
		}
		const uniqueSkills = [...new Set(flatSkills)];

		return res.status(200).json({
			status: true,
			skills: uniqueSkills,
			data: uniqueSkills,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: "Internal server error" });
	}
};

skills.getAll = async (req, res, io) => {
	try {
		const skillsDocuments = await skillsModel.find();

		/*
		// OLD IMPLEMENTATION: Main categories & subcategories (Commented out temporarily)
		const mainCategories = [];
		const subcategories = [];
		const allSkills = [];

		skillsDocuments.forEach((skillDocument) => {
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
		*/

		// NEW SIMPLE IMPLEMENTATION: Flat Array of Skill Strings
		const flatSkills = [];
		skillsDocuments.forEach((doc) => {
			if (doc.subcategories) {
				for (const subCat of doc.subcategories.values()) {
					if (Array.isArray(subCat.skills)) {
						flatSkills.push(...subCat.skills);
					}
				}
			}
		});

		const uniqueSkills = [...new Set(flatSkills)];

		return res.status(200).json({
			status: true,
			skills: uniqueSkills,
			data: uniqueSkills,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, message: "Internal server error" });
	}
};

skills.create = async (req, res, io) => {
	try {
		const { mainCategory, subCategory, skills } = req.body;

		let skillsList = [];
		if (Array.isArray(skills)) {
			skillsList = skills;
		} else if (typeof skills === "string") {
			skillsList = [skills];
		} else if (Array.isArray(req.body)) {
			skillsList = req.body;
		}

		if (!skillsList.length) {
			return res.status(400).json({ status: false, message: "Skills array is required" });
		}

		const categoryName = mainCategory || "General";
		const subCatName = subCategory || "General";

		let skill = await skillsModel.findOne({ mainCategory: categoryName });

		if (!skill) {
			skill = new skillsModel({ mainCategory: categoryName });
		}

		if (!skill.subcategories.has(subCatName)) {
			skill.subcategories.set(subCatName, { name: subCatName, skills: [] });
		}

		const subcategory = skill.subcategories.get(subCatName);
		skillsList.forEach((skillName) => {
			if (!subcategory.skills.includes(skillName)) {
				subcategory.skills.push(skillName);
			}
		});

		await skill.save();

		return res.status(200).json({ status: true, message: "Skills added successfully", skills: subcategory.skills });
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
