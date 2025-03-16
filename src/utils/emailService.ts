import nodemailer, { Transporter } from 'nodemailer';
import { GraphQLError } from 'graphql';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Nodemailer transporter with explicit SMTP settings
const transporter: Transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
  port: parseInt(process.env.EMAIL_PORT || '587'), // Default to 587 (TLS)
  secure: process.env.EMAIL_PORT === '465', // True for SSL (465), false for TLS (587)
  auth: {
    user: process.env.EMAIL_USER, // e.g., vj1502003@gmail.com
    pass: process.env.EMAIL_PASSWORD, // App-specific password
  },
});

// Centralized activity logging helper
async function logActivity(userId: string, action: string, resourceType?: string, resourceId?: string) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
      },
    });
  } catch (logError) {
    console.error(`❌ Failed to log activity for user ${userId}:`, logError);
  }
}

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
  userId?: string // Optional for logging
): Promise<void> => {
  // Check for required environment variables
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error("❌ Email configuration missing: EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD not set.");
    throw new GraphQLError("Email service configuration error.", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Car Rental System" <${process.env.EMAIL_USER}>`, // Fallback to EMAIL_USER
      to,
      subject,
      text,
      html, // Optional HTML content
    });

    console.log(`✅ Email sent to ${to}`);

    // Log activity if userId is provided
    if (userId) {
      await logActivity(userId, `Email sent: ${subject}`, "Email");
    }
  } catch (error) {
    // Handle unknown error type with a type guard
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw new GraphQLError(`Failed to send email to ${to}.`, {
      extensions: { code: "INTERNAL_SERVER_ERROR", details: errorMessage },
    });
  }
};