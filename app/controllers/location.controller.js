const Location = require("../models/location.model");

const location = {};

location.create = async (req, res) => {
	try {
		const bodyData = req.body;
		const newLocation = new Location(bodyData);
		const newLocationRecord = await newLocation.save();
		return res.status(200).send({ status: true, msg: "Your response added successfully!!", data: newLocationRecord });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

location.get = async (req, res) => {
	try {
		const filter = {};
		if (req.query.cityName) filter.cityName = { $regex: req.query.cityName, $options: "i" };
		const getAll = await Location.find(filter);
		const locationCount = await Location.countDocuments();
		return res.status(200).send({ status: true, msg: "All location fetch successfully!!", locationCount, locations: getAll });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

location.delete = async (req, res) => {
	try {
		
		return res.status(200).send({ status: true, msg: "One location deleted successfully!!" });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

module.exports = location;
