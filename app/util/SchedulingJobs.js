const schedule = require("node-schedule");
const userModel = require("../models/user.model");
const createNotification = require("./createNotification");

module.exports = (io) => {
	const userProfile = schedule.scheduleJob("0 */8 * * *", async () => {
		const users = await userModel.find({ profileComplete: { $lt: 100 } });

		users.forEach(async (user) => {
			let data = null;

			if (user.userType === "jobSeeker") {
				data = await createNotification({
					senderId: user._id,
					receiverId: user._id,
					title: `Profile is incomplete`,
					desc: `Please complete your profile to increase your chances of getting selected by the company.`,
					logo: "",
				});
			} else {
				data = await createNotification({
					senderId: user._id,
					receiverId: user._id,
					title: `Profile is incomplete`,
					desc: `Please complete your profile.`,
					logo: "",
				});
			}
			io.emit(`notifications_${data.receiverId._id}`, data);
		});
	});

	const expireJobs = schedule.scheduleJob("0 * * * *", async () => {
		const expireJobsAndServices = require("./expireJobsAndServices");
		await expireJobsAndServices();
	});
};
