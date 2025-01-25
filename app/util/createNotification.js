const adminUserModel = require("../models/adminUser.model");
const Notification = require("../models/notification.model");
const userModel = require("../models/user.model");

// const createNotification = require("../util/createNotification");
// const data = await createNotification({
// 	senderId: updatedApplication.applierId,
// 	receiverId: updatedApplication.applicantId,
// 	title: `${updatedApplication.jobId.companyName}`,
// 	desc: `You have been selected for the ${updatedApplication.jobId.jobTittle} job`,
// 	logo: updatedApplication.jobId.companyLogo,
// });
// io.emit(`notifications_${data.receiverId._id}`, data);

async function populate(notification) {
	try {
		let sender;
		if (notification.senderType === "user")
			sender = await userModel.findById(notification.senderId).select("name profileImage");
		else if (notification.senderType === "adminUser")
			sender = await adminUserModel.findById(notification.senderId).select("name profileImage");

		let receiver;
		if (notification.receiverType === "user")
			receiver = await userModel.findById(notification.receiverId).select("name profileImage");
		else if (notification.receiverType === "adminUser")
			receiver = await adminUserModel.findById(notification.receiverId).select("name profileImage");

		notification.senderId = sender;
		notification.receiverId = receiver;
		return notification;
	} catch (error) {
		console.error("Error populating sender:", error);
	}
}

const createNotification = async ({
	senderType = "user",
	receiverType = "user",
	senderId,
	receiverId,
	title,
	desc,
	logo = "",
	keyName,
	extraData,
}) => {
	const data = extraData
		? { senderType, receiverType, senderId, receiverId, title, desc, extra: { logo, [keyName]: extraData } }
		: { senderType, receiverType, senderId, receiverId, title, desc, extra: { logo } };
	const createNotification = await Notification.create(data);

	const fetchNotifications = await Notification.findOne({ _id: createNotification._id }).sort({ createdAt: -1 }).lean();

	return await populate(fetchNotifications);
};
module.exports = createNotification;
