import { PrismaClient } from "@prisma/client";
import { sendEmail } from "./emailService.js";

const prisma = new PrismaClient();

export const sendNotification = async (userId: string, message: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      console.error(`❌ User not found for notification: ${userId}`);
      return;
    }

    // Send via email (could add SMS or push notification logic)
    await sendEmail(user.email, "Car Rental Notification", message, undefined, userId);

    console.log(`📢 Notification sent to User (${userId}): ${message}`);
  } catch (error) {
    console.error(`❌ Failed to send notification to User (${userId}):`, error);
  }
};