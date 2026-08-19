const nodemailer = require("nodemailer");


const sendMail = async (toEmail, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: process.env.SMTP_PORT || 587,
            auth: {
                user: process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_MAIL,
            to: toEmail,
            subject: subject,
            html: htmlContent,
        });

        console.log(`Email successfully sent to ${toEmail}`);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

module.exports = sendMail;