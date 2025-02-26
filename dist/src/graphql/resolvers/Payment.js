import { initializePayment, verifyPayment } from "../../services/paystack.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient(); // ✅ Create a PrismaClient instance
export const paymentResolvers = {
    Query: {
        verifyPayment: async (_, { reference }) => {
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
                const convertedAmount = amount / 100; // Convert from Kobo to Naira
                const customerEmail = customer?.email?.toLowerCase().trim();
                // ✅ Ensure email is valid
                if (!customerEmail) {
                    return {
                        status: false,
                        message: "Payment verification failed: No email found.",
                        data: null,
                    };
                }
                // ✅ Fetch the user ID based on the email
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
                // ✅ Check if payment already exists to prevent duplicates
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
                // ✅ Handle abandoned or failed payments
                if (status !== "success") {
                    return {
                        status: false,
                        message: `Payment was not successful. Status: ${status}`,
                        data: null,
                    };
                }
                // ✅ Store successful payments
                const newPayment = await prisma.payment.create({
                    data: {
                        userId: user.id, // ✅ Ensure userId is included
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
            }
            catch (error) {
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
        initializePayment: async (_, { email, amount }) => {
            try {
                if (amount <= 0) {
                    return {
                        status: false,
                        message: "Invalid payment amount.",
                        data: null,
                    };
                }
                const response = await initializePayment(email.toLowerCase().trim(), amount * 100); // Convert NGN to Kobo
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
            }
            catch (error) {
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
