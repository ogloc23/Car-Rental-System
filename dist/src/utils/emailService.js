import nodemailer from "nodemailer";
import { GraphQLError } from "graphql";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
// Centralized activity logging helper (optional)
async function logActivity(userId, action, resourceType, resourceId) {
    await prisma.activityLog.create({
        data: {
            userId,
            action,
            resourceType,
            resourceId,
        },
    });
}
export const sendEmail = async (to, subject, text, html, userId // Optional for logging
) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ Email configuration missing: EMAIL_USER or EMAIL_PASS not set.");
        throw new GraphQLError("Email service configuration error.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
    }
    try {
        await transporter.sendMail({
            from: `"Car Rental System" <${process.env.EMAIL_USER}>`, // Customized app name
            to,
            subject,
            text,
            html, // Optional HTML content
        });
        console.log(`✅ Email sent to ${to}`);
        // Optional: Log email send if userId is provided
        if (userId) {
            await logActivity(userId, `Email sent: ${subject}`, "Email", undefined);
        }
    }
    catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error);
        throw new GraphQLError(`Failed to send email to ${to}.`, {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
    }
};
