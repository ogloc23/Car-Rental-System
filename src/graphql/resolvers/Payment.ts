import { GraphQLError } from "graphql";
import { PrismaClient } from "@prisma/client";
import { Context } from "../../types/types.js";
import { initializePayment, verifyPayment } from "../../services/paystack.js";

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
    initializePayment: async (_: any, { email, amount }: { email: string; amount: number }, context: Context) => {
      try {
        if (!context.user) {
          throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
        }

        const response = await initializePayment(email.toLowerCase().trim(), amount);

        if (!response.status || !response.data) {
          throw new GraphQLError(response.message || "Failed to initialize payment.", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        const { authorization_url, access_code, reference } = response.data; // Safe after check

        await logActivity(context.user.id, `Initialized payment: ${reference} (${amount} NGN)`, "Payment", reference);

        return {
          status: true,
          message: "Payment initialized successfully.",
          data: {
            authorization_url,
            access_code,
            reference,
          },
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