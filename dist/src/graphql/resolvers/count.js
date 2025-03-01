import { PrismaClient } from "@prisma/client";
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
                throw new Error("Failed to fetch dashboard statistics");
            }
        },
    },
};
