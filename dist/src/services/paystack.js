import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;
const PAYSTACK_API_URL = "https://api.paystack.co";
// ✅ Validate environment variables at runtime
if (!PAYSTACK_SECRET_KEY) {
    throw new Error("❌ Missing PAYSTACK_SECRET_KEY in environment variables.");
}
if (!PAYSTACK_CALLBACK_URL) {
    throw new Error("❌ Missing PAYSTACK_CALLBACK_URL in environment variables.");
}
// ✅ Set up headers for API requests
const HEADERS = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
};
/**
 * ✅ Initialize a payment with Paystack.
 * @param email - Customer's email address.
 * @param amount - Amount in Naira (NGN).
 * @returns PaystackResponse
 */
export const initializePayment = async (email, amount) => {
    try {
        if (amount <= 0) {
            throw new Error("❌ Invalid payment amount. Must be greater than zero.");
        }
        // ✅ Convert NGN to Kobo before sending to Paystack
        const amountInKobo = amount * 100;
        const response = await axios.post(`${PAYSTACK_API_URL}/transaction/initialize`, {
            email,
            amount: amountInKobo,
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
 * ✅ Verify a payment transaction on Paystack.
 * @param reference - The payment reference.
 * @returns PaystackResponse
 */
export const verifyPayment = async (reference) => {
    try {
        const response = await axios.get(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, { headers: HEADERS });
        if (!response.data?.status) {
            throw new Error("❌ Payment verification failed at Paystack.");
        }
        // ✅ Convert amount from Kobo to Naira before returning
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
