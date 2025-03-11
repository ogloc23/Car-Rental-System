import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
    service: "Gmail", // You can change this based on your email provider
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // App password or SMTP password
    },
});
/**
 * Sends an email to a user
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param text - Email body (text format)
 */
export const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"Your App Name" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
        });
        console.log(`✅ Email sent to ${to}`);
    }
    catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        throw new Error("Failed to send email.");
    }
};
