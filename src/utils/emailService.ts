import nodemailer, { Transporter } from 'nodemailer';
import { GraphQLError } from 'graphql';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Nodemailer transporter with explicit SMTP settings
const transporter: Transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
  port: parseInt(process.env.EMAIL_PORT || '587'), // Default to 587 if not set
  secure: process.env.EMAIL_PORT === '465', // True for 465 (SSL), false for 587 (TLS)
  auth: {
    user: process.env.EMAIL_USER, // e.g., your-email@gmail.com
    pass: process.env.EMAIL_PASSWORD, // App-specific password or API key
  },
});

// Centralized activity logging helper
async function logActivity(userId: string, action: string, resourceType?: string, resourceId?: string): Promise<void> {
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
  } finally {
    await prisma.$disconnect(); // Ensure Prisma disconnects
  }
}

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string,
  userId?: string // Optional for logging
): Promise<void> => {
  // Explicitly type missingVars as string[]
  const missingVars: string[] = [];
  if (!process.env.EMAIL_HOST) missingVars.push('EMAIL_HOST');
  if (!process.env.EMAIL_USER) missingVars.push('EMAIL_USER');
  if (!process.env.EMAIL_PASSWORD) missingVars.push('EMAIL_PASSWORD');

  if (missingVars.length > 0) {
    const errorMsg = `Email configuration incomplete: Missing ${missingVars.join(', ')}.`;
    console.error(`❌ ${errorMsg}`);
    throw new GraphQLError("Email service configuration error.", {
      extensions: { code: "INTERNAL_SERVER_ERROR", details: errorMsg },
    });
  }

  try {
    // Verify transporter configuration before sending
    await transporter.verify();
    console.log(`✅ Email transporter verified for ${process.env.EMAIL_USER}`);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Car Rental System" <${process.env.EMAIL_USER}>`, // Fallback to EMAIL_USER
      to,
      subject,
      text,
      html, // Optional HTML content
    });

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);

    // Log activity if userId is provided
    if (userId) {
      await logActivity(userId, `Email sent: ${subject}`, 'Email');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw new GraphQLError("Failed to send email.", {
      extensions: { code: "INTERNAL_SERVER_ERROR", details: `Email service error: ${errorMessage}` },
    });
  }
};