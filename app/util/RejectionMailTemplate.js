const getRejectionMailTemplate = (name, reason) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 8px;">
        <h2 style="color: #333; text-align: center;">Update on your Application</h2>
        
        <p style="color: #333; font-size: 16px;">Hi <strong>${name}</strong>,</p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            Thank you for your interest in joining HiringRoof as an HR Admin and for taking the time to apply.
        </p>

        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            After careful consideration, we regret to inform you that we are unable to proceed with your application at this time.
        </p>

        ${reason ? `
        <div style="background-color: #fff3f3; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;">
            <p style="margin: 0; color: #d9534f; font-size: 14px;"><strong>Feedback from our team:</strong><br><br>${reason}</p>
        </div>
        ` : ''}

        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            We appreciate the opportunity to review your profile and wish you the absolute best in your future endeavors.
        </p>

        <br>
        <p style="color: #555; font-size: 15px;">
            Best regards,<br>
            <strong>The HiringRoof Team</strong>
        </p>
    </div>
    `;
};

module.exports = { getRejectionMailTemplate };
