const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || "smtp.gmail.com",
	port: Number(process.env.SMTP_PORT) || 587,
	secure: Number(process.env.SMTP_PORT) === 465,
	auth:
		process.env.SMTP_USER && process.env.SMTP_PASS
			? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
			: undefined,
});

const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
	if (!to) throw new Error("Recipient email is required !!");

	return transporter.sendMail({
		from: process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@hiringroof.com",
		to,
		subject,
		html,
		text,
		attachments,
	});
};

module.exports = sendEmail;
