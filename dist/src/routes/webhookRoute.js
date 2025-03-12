import express from "express";
import crypto from "crypto";
import { verifyPayment } from "../services/paystack.js";
import { PrismaClient } from "@prisma/client";
const router = express.Router();
const prisma = new PrismaClient();
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
router.post("/webhook", express.json(), async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            console.error("❌ PAYSTACK_SECRET_KEY is missing in environment variables.");
            return res.status(500).json({ message: "Server configuration error." });
        }
        const hash = crypto
            .createHmac("sha512", secret)
            .update(JSON.stringify(req.body))
            .digest("hex");
        if (hash !== req.headers["x-paystack-signature"]) {
            console.warn("⚠️ Invalid Paystack signature detected.");
            return res.status(400).json({ message: "Invalid Paystack signature" });
        }
        const { event, data } = req.body;
        if (event === "charge.success") {
            console.log("🔄 Verifying payment with reference:", data.reference);
            const payment = await verifyPayment(data.reference);
            if (!payment.status || !payment.data) {
                console.warn("⚠️ Payment verification failed:", payment.message);
                return res.status(400).json({ message: payment.message || "Payment verification failed." });
            }
            const { amount, status, currency, customer } = payment.data; // Safe after check
            const customerEmail = customer?.email?.toLowerCase().trim();
            const amountInNaira = amount; // Already in Naira from paystack.ts
            if (!customerEmail) {
                console.warn("⚠️ No customer email in payment data.");
                return res.status(400).json({ message: "No customer email provided." });
            }
            const user = await prisma.user.findUnique({
                where: { email: customerEmail },
                select: { id: true },
            });
            if (!user) {
                console.warn("⚠️ User not found for email:", customerEmail);
                return res.status(400).json({ message: "User not found." });
            }
            let paymentRecord = await prisma.payment.findUnique({
                where: { reference: data.reference },
            });
            if (!paymentRecord) {
                paymentRecord = await prisma.payment.create({
                    data: {
                        userId: user.id,
                        reference: data.reference,
                        email: customerEmail,
                        amount: amountInNaira,
                        currency,
                        status,
                    },
                });
                console.log("✅ Created new payment record:", paymentRecord);
            }
            else {
                paymentRecord = await prisma.payment.update({
                    where: { reference: data.reference },
                    data: { status, amount: amountInNaira },
                });
                console.log("✅ Updated payment status to:", status);
            }
            if (status === "success") {
                await logActivity(user.id, `Payment confirmed via webhook: ${data.reference} (${amountInNaira} ${currency})`, "Payment", paymentRecord.id);
            }
            else if (status === "failed") {
                console.warn("❌ Payment status updated to FAILED.");
            }
            else {
                console.log("⌛ Payment status:", status, "- No further action.");
            }
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error("❌ Error handling Paystack webhook:", error);
        res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error." });
    }
});
export default router;
