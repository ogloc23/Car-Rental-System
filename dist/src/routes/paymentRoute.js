import express from "express";
import { verifyPayment } from "../services/paystack.js"; // Adjust the path as needed
const router = express.Router();
router.get("/callback", async (req, res) => {
    const { reference } = req.query;
    if (!reference) {
        return res.status(400).json({ status: false, message: "No reference provided." });
    }
    try {
        const response = await verifyPayment(reference);
        if (response.status) {
            return res.status(200).json({
                status: true,
                message: "Payment successful!",
                data: response.data,
            });
        }
        else {
            return res.status(400).json({
                status: false,
                message: "Payment verification failed.",
            });
        }
    }
    catch (error) {
        console.error("❌ Error handling callback:", error);
        res.status(500).json({
            status: false,
            message: "Internal server error.",
        });
    }
});
export default router;
