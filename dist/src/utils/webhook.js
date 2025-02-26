import express from "express";
import crypto from "crypto";
import { verifyPayment } from "../services/paystack.js";
import { PrismaClient } from "@prisma/client";
const router = express.Router();
const prisma = new PrismaClient();
router.post("/paystack", express.json(), async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            console.error("❌ PAYSTACK_SECRET_KEY is missing in environment variables.");
            return res.status(500).json({ message: "Server configuration error." });
        }
        // Validate Paystack signature
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
            if (!payment?.status) {
                console.warn("⚠️ Payment verification failed:", payment?.message);
                return res.status(400).json({ message: "Payment verification failed." });
            }
            console.log("✅ Payment Verified:", payment);
            // Convert amount from Kobo to Naira
            const amountInNaira = payment.data.amount / 100;
            console.log(`✅ Payment Amount: ₦${amountInNaira}`);
            // Handle different payment statuses
            if (payment.data.status === "success") {
                await prisma.payment.update({
                    where: { reference: data.reference },
                    data: { status: "success", amount: amountInNaira },
                });
                console.log("✅ Payment status updated to SUCCESS.");
            }
            else if (payment.data.status === "failed") {
                await prisma.payment.update({
                    where: { reference: data.reference },
                    data: { status: "failed" },
                });
                console.warn("❌ Payment status updated to FAILED.");
            }
            else if (payment.data.status === "ongoing") {
                console.log("⌛ Payment is still ongoing. No update to database.");
            }
        }
        res.sendStatus(200);
    }
    catch (error) {
        console.error("❌ Error handling Paystack webhook:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
export default router;
