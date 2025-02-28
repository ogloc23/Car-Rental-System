import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;
const PAYSTACK_API_URL = "https://api.paystack.co";
if (!PAYSTACK_SECRET_KEY || !PAYSTACK_CALLBACK_URL) {
    throw new Error("Missing Paystack configuration in environment variables.");
}
const HEADERS = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
};
/**
 * Initialize a payment with Paystack.
 * @param email - Customer's email address.
 * @param amount - Amount in Naira (NGN).
 * @returns PaystackResponse
 */
export const initializePayment = async (email, amount) => {
    try {
        const response = await axios.post(`${PAYSTACK_API_URL}/transaction/initialize`, {
            email,
            amount, // Now in Naira, no need to multiply by 100
            currency: "NGN",
            callback_url: PAYSTACK_CALLBACK_URL,
        }, { headers: HEADERS });
        return response.data;
    }
    catch (error) {
        console.error("❌ Paystack API Error (Initialize Payment):", axios.isAxiosError(error) ? error.response?.data || error.message : error);
        throw new Error("Payment initialization failed. Please try again.");
    }
};
/**
 * Verify a payment transaction on Paystack.
 * @param reference - The payment reference.
 * @returns PaystackResponse
 */
export const verifyPayment = async (reference) => {
    try {
        const response = await axios.get(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, { headers: HEADERS });
        // Convert amount from Kobo to Naira before returning
        if (response.data?.data?.amount) {
            response.data.data.amount = response.data.data.amount / 100;
        }
        return response.data;
    }
    catch (error) {
        console.error("❌ Paystack API Error (Verify Payment):", axios.isAxiosError(error) ? error.response?.data || error.message : error);
        throw new Error("Payment verification failed. Please try again.");
    }
};
