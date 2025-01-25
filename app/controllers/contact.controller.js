const Contact = require("../models/contact.model");

const contact = {};

contact.create = async (req, res, io) => {
	try {
		const bodyData = req.body;
		const newContact = new Contact(bodyData);
		const newContactRecord = await newContact.save();
		return res.status(200).send({ status: true, msg: "Your response added successfully!!", data: newContactRecord });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

contact.get = async (req, res) => {
	try {
		const getAll = await Contact.find();
		const contactCount = await Contact.countDocuments();
		return res.status(200).send({ status: true, msg: "All contacts fetch successfully!!", contactCount, contacts: getAll });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

contact.delete = async (req, res) => {
	try {
		const { _id } = req.params;

		const findContact = await Contact.findById({ _id });
		if (!findContact) return res.status(404).send({ status: false, msg: "No contact found !!" });

		const deleteContact = await Contact.findByIdAndDelete({ _id });

		return res.status(200).send({ status: true, msg: "One contact deleted successfully!!", deleteContact });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

module.exports = contact;
