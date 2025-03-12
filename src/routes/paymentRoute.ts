import express from "express";
import { verifyPayment } from "../services/paystack.js";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

async function logActivity(userId: string, action: string, resourceType?: string, resourceId?: string) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
    },
  });
}

router.get("/callback", async (req, res) => {
  const { reference } = req.query;

  if (!reference || typeof reference !== "string") {
    return res.status(400).json({ status: false, message: "No reference provided." });
  }

  try {
    const response = await verifyPayment(reference);

    if (!response.status || !response.data) {
      return res.status(400).json({
        status: false,
        message: response.message || "Payment verification failed.",
      });
    }

    const { amount, status, currency, customer, gateway_response } = response.data; // Safe after check
    const customerEmail = customer?.email?.toLowerCase().trim();

    if (!customerEmail) {
      return res.status(400).json({
        status: false,
        message: "Payment verification failed: No email found.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "User not found. Cannot record payment.",
      });
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { reference },
    });

    if (existingPayment) {
      return res.status(200).json({
        status: true,
        message: "Payment already recorded.",
        data: existingPayment,
      });
    }

    if (status !== "success") {
      return res.status(400).json({
        status: false,
        message: `Payment failed: ${gateway_response || "Unknown reason"}.`,
      });
    }

    const newPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        reference,
        email: customerEmail,
        amount,
        currency,
        status,
      },
    });

    await logActivity(user.id, `Payment verified via callback: ${reference} (${amount} ${currency})`, "Payment", newPayment.id);

    return res.status(200).json({
      status: true,
      message: "Payment successful!",
      data: newPayment,
    });
  } catch (error) {
    console.error("❌ Error handling callback:", error);
    return res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : "Internal server error.",
    });
  }
});

export default router;