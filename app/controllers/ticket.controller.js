const TicketModel = require("../models/ticket.model");

const ticket = {};

ticket.create = async (req, res, io) => {
	try {
		const ticketCount = await TicketModel.countDocuments({ userId: req.user._id });

		const bodyData = {};
		bodyData.userId = req.user._id;
		bodyData.desc = req.body.desc;
		bodyData.ticketNo = Number(ticketCount + 1);

		const newTicket = await TicketModel.create(bodyData);
		const newTicketRecord = await TicketModel.findOne({ _id: newTicket._id }).populate({
			path: "userId",
			select: "name phone email profileImage userType",
		});
		return res.status(200).send({ status: true, msg: "Your ticket created successfully!!", data: newTicketRecord });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

ticket.get = async (req, res) => {
	try {
		const getAll = await TicketModel.find({ userId: req.user._id }).populate({
			path: "userId",
			select: "name phone email profileImage userType",
		});
		const ticketCount = await TicketModel.countDocuments({ userId: req.user._id });
		return res.status(200).send({ status: true, msg: "All ticket fetch successfully!!", ticketCount, data: getAll });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

ticket.getAll = async (req, res) => {
	try {
		const getAll = await TicketModel.find().populate({
			path: "userId",
			select: "name phone email profileImage userType",
		});
		const ticketCount = await TicketModel.countDocuments();
		return res.status(200).send({ status: true, msg: "All ticket fetch successfully!!", ticketCount, data: getAll });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

ticket.changeStatus = async (req, res) => {
	try {
		const id = req.params.id;

		const ticket = await TicketModel.findOne({ _id: id });
		if (!ticket) return res.status(404).send({ status: false, msg: "Invalid Ticket Id" });

		const updateTicket = await TicketModel.findByIdAndUpdate(id, { status: false }, { new: true }).populate({
			path: "userId",
			select: "name phone email profileImage userType",
		});
		// const ticketCount = await TicketModel.countDocuments();
		return res.status(200).send({ status: true, msg: "All ticket fetch successfully!!", data: updateTicket });
	} catch (error) {
		console.log(error);
		return res.status(500).send({ status: false, msg: error.message });
	}
};

module.exports = ticket;
