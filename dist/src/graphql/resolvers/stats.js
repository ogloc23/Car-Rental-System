import { PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";
const prisma = new PrismaClient();
export const countResolvers = {
    Query: {
        getDashboardStats: async () => {
            try {
                const totalUsers = await prisma.user.count();
                const totalCars = await prisma.car.count();
                const totalBookings = await prisma.booking.count();
                return {
                    totalUsers,
                    totalCars,
                    totalBookings,
                };
            }
            catch (error) {
                console.error("❌ Error fetching dashboard stats:", error);
                throw new GraphQLError("Failed to fetch dashboard statistics", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
        },
    },
};
