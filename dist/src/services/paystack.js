import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;
const PAYSTACK_API_URL = "https://api.paystack.co";
if (!PAYSTACK_SECRET_KEY || !PAYSTACK_CALLBACK_URL) {
    throw new Error("Missing Paystack configuration in environment variables.");
}
export const initializePayment = async (email, amount) => {
    try {
        const response = await axios.post(`${PAYSTACK_API_URL}/transaction/initialize`, {
            email,
            amount: amount * 100, // Convert to kobo (Paystack works with smallest currency unit)
            currency: "NGN",
            callback_url: PAYSTACK_CALLBACK_URL,
        }, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Paystack API Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || "Payment initialization failed.");
        }
        else {
            console.error("Unknown Error:", error);
            throw new Error("An unexpected error occurred during payment initialization.");
        }
    }
};
export const verifyPayment = async (reference) => {
    try {
        const response = await axios.get(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Paystack API Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || "Payment verification failed.");
        }
        else {
            console.error("Unknown Error:", error);
            throw new Error("An unexpected error occurred during payment verification.");
        }
    }
};
