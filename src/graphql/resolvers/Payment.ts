import { initializePayment, verifyPayment } from "../../services/paystack.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // ✅ Initialize Prisma Client

export const paymentResolvers = {
  Query: {
    verifyPayment: async (_: any, { reference }: { reference: string }) => {
      try {
        const response = await verifyPayment(reference);

        if (!response?.status) {
          return {
            status: false,
            message: "Payment verification failed. Please try again.",
            data: null,
          };
        }

        const { amount, status, currency, customer } = response.data;
        const customerEmail = customer?.email?.toLowerCase().trim();

        if (!customerEmail) {
          return {
            status: false,
            message: "Payment verification failed: No email found.",
            data: null,
          };
        }

        // ✅ Convert amount from Kobo to Naira
        const convertedAmount = amount / 100;

        // ✅ Fetch user ID based on the email
        const user = await prisma.user.findUnique({
          where: { email: customerEmail },
          select: { id: true },
        });

        if (!user) {
          return {
            status: false,
            message: "User not found. Cannot record payment.",
            data: null,
          };
        }

        // ✅ Check if payment already exists
        const existingPayment = await prisma.payment.findUnique({
          where: { reference },
        });

        if (existingPayment) {
          return {
            status: true,
            message: "Payment already recorded.",
            data: existingPayment,
          };
        }

        if (status !== "success") {
          return {
            status: false,
            message: `Payment failed or was abandoned. Status: ${status}`,
            data: null,
          };
        }

        // ✅ Store successful payment
        const newPayment = await prisma.payment.create({
          data: {
            userId: user.id,
            reference,
            email: customerEmail,
            amount: convertedAmount,
            currency,
            status,
          },
        });

        return {
          status: true,
          message: "Payment verified successfully.",
          data: newPayment,
        };
      } catch (error) {
        console.error("❌ Error verifying payment:", error);
        return {
          status: false,
          message: "An error occurred during payment verification.",
          data: null,
        };
      }
    },
  },

  Mutation: {
    initializePayment: async (_: any, { email, amount }: { email: string; amount: number }) => {
      try {
        if (amount <= 0) {
          return {
            status: false,
            message: "Invalid payment amount. Must be greater than zero.",
            data: null,
          };
        }

        // ✅ Convert NGN to Kobo before sending to Paystack
        const amountInKobo = amount * 100;

        const response = await initializePayment(email.toLowerCase().trim(), amountInKobo);

        if (!response?.status) {
          return {
            status: false,
            message: "Failed to initialize payment. Please try again.",
            data: null,
          };
        }

        return {
          status: true,
          message: "Payment initialized successfully.",
          data: {
            authorization_url: response.data.authorization_url,
            access_code: response.data.access_code,
            reference: response.data.reference,
          },
        };
      } catch (error) {
        console.error("❌ Error initializing payment:", error);
        return {
          status: false,
          message: "An error occurred while initializing payment.",
          data: null,
        };
      }
    },
  },
};
