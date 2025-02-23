import { PrismaClient } from "@prisma/client";
import { handleAuthorization } from "../../utils/error.js";
const prisma = new PrismaClient();
export const carResolvers = {
    Query: {
        getCars: async () => {
            try {
                return await prisma.car.findMany();
            }
            catch (error) {
                console.error("Error fetching cars:", error);
                throw new Error("Failed to fetch cars.");
            }
        },
        getCar: async (_parent, { id }) => {
            try {
                const car = await prisma.car.findUnique({ where: { id } });
                if (!car)
                    throw new Error("Car not found");
                return car;
            }
            catch (error) {
                console.error("Error fetching car:", error);
                throw new Error("Failed to fetch car.");
            }
        },
    },
    Mutation: {
        addCar: async (_parent, args, context) => {
            handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can add cars
            try {
                // Check if a car with the same license plate already exists
                const existingCar = await prisma.car.findUnique({
                    where: { licensePlate: args.licensePlate },
                });
                if (existingCar) {
                    throw new Error("A car with this license plate already exists.");
                }
                return await prisma.car.create({ data: args });
            }
            catch (error) {
                console.error("Error adding car:", error);
                throw new Error("Failed to add car. Please try again.");
            }
        },
        updateCar: async (_parent, { id, ...updates }, context) => {
            handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can update cars
            try {
                const existingCar = await prisma.car.findUnique({ where: { id } });
                if (!existingCar)
                    throw new Error("Car not found");
                return await prisma.car.update({
                    where: { id },
                    data: {
                        ...updates,
                        updatedAt: new Date(),
                    },
                });
            }
            catch (error) {
                console.error("Error updating car:", error);
                throw new Error("Failed to update car. Please try again.");
            }
        },
        deleteCar: async (_parent, { id }, context) => {
            handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can delete cars
            try {
                const existingCar = await prisma.car.findUnique({ where: { id } });
                if (!existingCar)
                    throw new Error("Car not found");
                return await prisma.car.delete({ where: { id } });
            }
            catch (error) {
                console.error("Error deleting car:", error);
                throw new Error("Failed to delete car. Please try again.");
            }
        },
    },
};
