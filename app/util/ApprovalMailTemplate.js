const getApprovalMailTemplate = (name, email, password, badge) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 8px;">
        <h2 style="color: #8f00ff; text-align: center;">Welcome to HiringRoof!</h2>
        
        <p style="color: #333; font-size: 16px;">Congratulations <strong>${name}</strong>,</p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            We are thrilled to inform you that your application to join as an HR Admin has been <strong>approved</strong>. 
            You have been assigned the <strong>${badge}</strong> badge!
        </p>

        <div style="background-color: #f7f8fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #333; font-weight: bold;">Your Login Credentials:</p>
            <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Password:</strong> ${password}</p>
        </div>

        <p style="color: #d9534f; font-size: 14px;">
            <em>* Please log in and change your password immediately for security purposes.</em>
        </p>

        <br>
        <p style="color: #555; font-size: 15px;">
            Best regards,<br>
            <strong>The HiringRoof Team</strong>
        </p>
    </div>
    `;
};

module.exports = { getApprovalMailTemplate };
