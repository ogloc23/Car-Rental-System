import { PrismaClient, CarStatus } from "@prisma/client";
import { adminOrStaffMiddleware } from "../../middleware/adminOrStaffMiddleware.js";
import { GraphQLError } from "graphql";
const prisma = new PrismaClient();
// Centralized activity logging helper (copied from User.ts)
async function logActivity(userId, action, resourceType, resourceId) {
    await prisma.activityLog.create({
        data: {
            userId,
            action,
            resourceType,
            resourceId,
        },
    });
}
export const carResolvers = {
    Query: {
        getCars: async () => {
            try {
                return await prisma.car.findMany();
            }
            catch (error) {
                console.error("Error fetching cars:", error);
                throw new GraphQLError("Failed to fetch cars.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
            }
        },
        getCar: async (_parent, { id }) => {
            try {
                const car = await prisma.car.findUnique({ where: { id } });
                if (!car)
                    throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
                return car;
            }
            catch (error) {
                console.error("Error fetching car:", error);
                throw new GraphQLError("Failed to fetch car.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
            }
        },
    },
    Mutation: {
        addCar: async (_parent, { make, model, year, licensePlate, type, price, availability, carStatus, imageUrl, description, }, context) => {
            await adminOrStaffMiddleware(context); // Ensures context.user exists
            // Type guard for TypeScript (though middleware guarantees context.user)
            if (!context.user) {
                throw new GraphQLError("Unexpected error: User not authenticated after middleware.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
            try {
                const existingCar = await prisma.car.findUnique({ where: { licensePlate } });
                if (existingCar) {
                    throw new GraphQLError("A car with this license plate already exists.", {
                        extensions: { code: "BAD_REQUEST" },
                    });
                }
                const carData = {
                    make,
                    model,
                    year,
                    licensePlate,
                    type,
                    price,
                    availability,
                    carStatus: CarStatus[carStatus],
                    imageUrl: imageUrl ?? null,
                    description,
                };
                const car = await prisma.car.create({ data: carData });
                // Log the action
                await logActivity(context.user.id, `Added car: ${make} ${model}`, "Car", car.id);
                return car;
            }
            catch (error) {
                console.error("Error adding car:", error);
                throw new GraphQLError("Failed to add car. Please try again.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
        },
        buyCar: async (_parent, { carId, fullName, phoneNumber, email, }, context) => {
            if (!context.user) {
                throw new GraphQLError("You must be logged in to purchase a car.", {
                    extensions: { code: "UNAUTHORIZED" },
                });
            }
            try {
                const car = await prisma.car.findUnique({
                    where: {
                        id: carId
                    }
                });
                if (!car)
                    throw new GraphQLError("Car not found", {
                        extensions: { code: "NOT FOUND" }
                    });
                if (car.carStatus != "AVAILABLE") {
                    throw new GraphQLError("Car is not available for purchase.", {
                        extensions: { code: "BAD_REQUEST" },
                    });
                }
                // Create the purchase
                const purchase = await prisma.purchase.create({
                    data: {
                        userId: context.user.id,
                        carId,
                        fullName,
                        phoneNumber,
                        email,
                        price: car.price,
                        // createdAt: new Date()
                    },
                    include: {
                        car: true
                    },
                });
                //Mark the car as SOLD
                await prisma.car.update({
                    where: { id: carId },
                    data: {
                        carStatus: CarStatus.SOLD,
                        availability: false
                    },
                });
                return purchase;
            }
            catch (error) {
                console.error("Error buying car:", error);
                throw new GraphQLError("Failed to buy car. Please try again.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" }
                });
            }
        },
        updateCar: async (_parent, { id, carStatus, description, ...updates }, context) => {
            await adminOrStaffMiddleware(context); // Ensures context.user exists
            if (!context.user) {
                throw new GraphQLError("Unexpected error: User not authenticated after middleware.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
            try {
                const existingCar = await prisma.car.findUnique({ where: { id } });
                if (!existingCar) {
                    throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
                }
                const updatedCar = await prisma.car.update({
                    where: { id },
                    data: {
                        ...updates,
                        ...(carStatus ? { carStatus: CarStatus[carStatus] } : {}),
                        ...(description ? { description } : {}),
                        updatedAt: new Date(),
                    },
                });
                // Log the action (only if status or description changes, for example)
                if (carStatus || description) {
                    await logActivity(context.user.id, `Updated car: ${existingCar.make} ${existingCar.model} (Status: ${carStatus || existingCar.carStatus})`, "Car", id);
                }
                return updatedCar;
            }
            catch (error) {
                console.error("Error updating car:", error);
                throw new GraphQLError("Failed to update car. Please try again.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
        },
        deleteCar: async (_parent, { id }, context) => {
            await adminOrStaffMiddleware(context); // Ensures context.user exists
            if (!context.user) {
                throw new GraphQLError("Unexpected error: User not authenticated after middleware.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
            try {
                const existingCar = await prisma.car.findUnique({ where: { id } });
                if (!existingCar) {
                    throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
                }
                const deletedCar = await prisma.car.delete({ where: { id } });
                // Log the action
                await logActivity(context.user.id, `Deleted car: ${existingCar.make} ${existingCar.model}`, "Car", id);
                return deletedCar;
            }
            catch (error) {
                console.error("Error deleting car:", error);
                throw new GraphQLError("Failed to delete car. Please try again.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
        },
    },
};
