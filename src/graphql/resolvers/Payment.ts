import { GraphQLError } from "graphql";
import { PrismaClient } from "@prisma/client";
import { Context } from "../../types/types.js";
import { initializePayment, verifyPayment } from "../../services/paystack.js";
import axios from 'axios';

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

export const paymentResolvers = {
  Query: {
    verifyPayment: async (_: any, { reference }: { reference: string }, context: Context) => {
      try {
        const response = await verifyPayment(reference);

        if (!response.status || !response.data) {
          throw new GraphQLError(response.message || "Payment verification failed.", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        const { amount, status, currency, customer, gateway_response } = response.data; // Safe after check
        const customerEmail = customer?.email?.toLowerCase().trim();

        if (!customerEmail) {
          throw new GraphQLError("Payment verification failed: No email found.", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        const user = await prisma.user.findUnique({
          where: { email: customerEmail },
          select: { id: true },
        });

        if (!user) {
          throw new GraphQLError("User not found. Cannot record payment.", {
            extensions: { code: "NOT_FOUND" },
          });
        }

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
            message: `Payment failed: ${gateway_response || "Unknown reason"}.`,
            data: null,
          };
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

        await logActivity(user.id, `Payment verified: ${reference} (${amount} ${currency})`, "Payment", newPayment.id);

        return {
          status: true,
          message: "Payment verified successfully.",
          data: newPayment,
        };
      } catch (error) {
        console.error("❌ Error verifying payment:", error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          error instanceof Error ? error.message : "An error occurred during payment verification.",
          { extensions: { code: "INTERNAL_SERVER_ERROR" } }
        );
      }
    },
  },

  Mutation: {
    initializePayment: async (_: any, { bookingId }: { bookingId: string }, context: Context) => {
      try {
        // Check if user is authenticated
        if (!context.user) {
          throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
        }
    
        // Fetch booking details
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { user: true },
        });
        if (!booking) {
          throw new GraphQLError("Booking not found.", { extensions: { code: "NOT_FOUND" } });
        }
        if (booking.userId !== context.user.id) {
          throw new GraphQLError("You can only pay for your own bookings.", { extensions: { code: "FORBIDDEN" } });
        }
        if (booking.status !== "PENDING") {
          throw new GraphQLError("Booking already processed.", { extensions: { code: "BAD_REQUEST" } });
        }
    
        // Convert Prisma.Decimal to number
        const totalPrice = booking.totalPrice.toNumber(); // Convert Decimal to number
        const amountInKobo = totalPrice * 100; // Now works since totalPrice is a number
    
        // Prepare Paystack payment request
        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!;
        const email = booking.user.email.toLowerCase().trim();
        const callbackUrl = `${process.env.SERVER_URL}/payment/callback`;
    
        const response = await axios.post(
          "https://api.paystack.co/transaction/initialize",
          {
            email,
            amount: amountInKobo,
            callback_url: callbackUrl,
            metadata: { bookingId },
          },
          {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
          }
        );
    
        if (!response.data.status || !response.data.data) {
          throw new GraphQLError("Failed to initialize payment with Paystack.", {
            extensions: { code: "BAD_REQUEST" },
          });
        }
    
        const { authorization_url, reference } = response.data.data;
    
        // Log activity (use toString() for totalPrice in message to avoid type issues)
        await logActivity(context.user.id, `Initialized payment: ${reference} (${booking.totalPrice.toString()} NGN)`, "Payment", reference);
    
        return {
          paymentUrl: authorization_url,
          reference,
        };
      } catch (error) {
        console.error("❌ Error initializing payment:", error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError(
          error instanceof Error ? error.message : "An error occurred while initializing payment.",
          { extensions: { code: "INTERNAL_SERVER_ERROR" } }
        );
      }
    },
  },
};