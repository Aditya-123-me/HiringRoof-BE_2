const extractSkillSub = (skillDetails) => {
	let skillSubCategories = [];
	let skills = [];
	let mergedMap = {};

	skillDetails.map((data) => {
		if (!skillSubCategories.includes(data.sub)) skillSubCategories.push(data.sub);

		data.skills.map((skill) => {
			if (!skills.includes(skill)) skills.push(skill);
		});
	});

	skillDetails.forEach((obj) => {
		const key = `${obj.main}-${obj.sub}`;
		if (!mergedMap[key]) {
			mergedMap[key] = { ...obj };
		} else {
			mergedMap[key].skills = [...new Set([...mergedMap[key].skills, ...obj.skills])];
		}
	});

	const mergedSkillDetails = Object.values(mergedMap);

	return { skillSubCategories, skills, mergedSkillDetails };
};

module.exports = extractSkillSub;
