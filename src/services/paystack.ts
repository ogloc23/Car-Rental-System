import axios from "axios";
import dotenv from "dotenv";
import { GraphQLError } from "graphql";

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("❌ Missing PAYSTACK_SECRET_KEY in environment variables.");
}

if (!PAYSTACK_CALLBACK_URL) {
  throw new Error("❌ Missing PAYSTACK_CALLBACK_URL in environment variables.");
}

const HEADERS = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

// Refined Paystack response types
interface PaystackInitializationData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackVerificationData {
  amount: number; // In Naira after conversion
  status: string;
  currency: string;
  customer: { email: string };
  gateway_response?: string;
}

interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data?: T;
}

export const initializePayment = async (
  email: string,
  amount: number
): Promise<PaystackResponse<PaystackInitializationData>> => {
  try {
    if (amount <= 0) {
      throw new GraphQLError("Invalid payment amount. Must be greater than zero.", {
        extensions: { code: "BAD_REQUEST" },
      });
    }

    const amountInKobo = amount * 100;

    const response = await axios.post<PaystackResponse<PaystackInitializationData>>(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        email,
        amount: amountInKobo,
        currency: "NGN",
        callback_url: PAYSTACK_CALLBACK_URL,
      },
      { headers: HEADERS }
    );

    if (!response.data.status) {
      throw new GraphQLError(response.data.message || "Payment initialization failed.", {
        extensions: { code: "BAD_REQUEST" },
      });
    }

    return response.data;
  } catch (error) {
    console.error(
      "❌ Paystack API Error (Initialize Payment):",
      axios.isAxiosError(error) ? error.response?.data || error.message : error
    );
    if (error instanceof GraphQLError) throw error;
    throw new GraphQLError(
      axios.isAxiosError(error) ? error.response?.data?.message || "Payment initialization failed." : "Payment initialization failed.",
      { extensions: { code: "INTERNAL_SERVER_ERROR" } }
    );
  }
};

export const verifyPayment = async (reference: string): Promise<PaystackResponse<PaystackVerificationData>> => {
  try {
    if (!reference) {
      throw new GraphQLError("Payment reference is required.", {
        extensions: { code: "BAD_REQUEST" },
      });
    }

    const response = await axios.get<PaystackResponse<PaystackVerificationData>>(
      `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
      { headers: HEADERS }
    );

    if (!response.data?.status) {
      throw new GraphQLError(response.data.message || "Payment verification failed at Paystack.", {
        extensions: { code: "BAD_REQUEST" },
      });
    }

    if (response.data?.data?.amount) {
      response.data.data.amount = response.data.data.amount / 100; // Kobo to Naira
    }

    return response.data;
  } catch (error) {
    console.error(
      "❌ Paystack API Error (Verify Payment):",
      axios.isAxiosError(error) ? error.response?.data || error.message : error
    );
    if (error instanceof GraphQLError) throw error;
    throw new GraphQLError(
      axios.isAxiosError(error) ? error.response?.data?.message || "Payment verification failed." : "Payment verification failed.",
      { extensions: { code: "INTERNAL_SERVER_ERROR" } }
    );
  }
};