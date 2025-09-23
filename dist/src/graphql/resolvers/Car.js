import { PrismaClient, CarStatus, PurchaseStatus } from "@prisma/client";
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
        purchases: async (_parent, { status }, context) => {
            await adminOrStaffMiddleware(context);
            return await context.prisma.purchase.findMany({
                where: status ? {
                    status
                } : undefined,
                orderBy: { createdAt: "desc" },
                include: {
                    car: true,
                    user: true,
                },
            });
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
                throw new GraphQLError("You must be logged in to purchase a ccar.", {
                    extensions: { code: "UNAUTHORIZED" },
                });
            }
            try {
                return await prisma.$transaction(async (tx) => {
                    //1: Fetch the car
                    let car = await tx.car.findUnique({
                        where: {
                            id: carId
                        }
                    });
                    if (!car) {
                        throw new GraphQLError("Car not found", {
                            extensions: { code: "NOT_FOUND" },
                        });
                    }
                    // 2. If the car is SOLD but there are no purchases, reset it
                    if (car.carStatus === CarStatus.SOLD) {
                        const existingPurchases = await tx.purchase.findMany({
                            where: { carId },
                        });
                        if (existingPurchases.length === 0) {
                            car = await tx.car.update({
                                where: { id: carId },
                                data: {
                                    carStatus: CarStatus.AVAILABLE, availability: true
                                },
                            });
                        }
                    }
                    // 3. Block purchase if stil not available
                    if (car.carStatus !== CarStatus.AVAILABLE) {
                        throw new GraphQLError("Car is not available for purchase.", {
                            extensions: { code: "BAD REQUEST" },
                        });
                    }
                    // 4. Crate the purchase
                    const purchase = await tx.purchase.create({
                        data: {
                            userId: context.user.id,
                            carId,
                            fullName,
                            phoneNumber,
                            email,
                            price: car.price,
                        },
                        include: { car: true },
                    });
                    // 5. Update the car to SOLD
                    await tx.car.update({
                        where: { id: carId },
                        data: { carStatus: CarStatus.SOLD, availability: false },
                    });
                    return purchase;
                });
            }
            catch (error) {
                console.error("Error buying car:", error);
                if (error.code === "P2002") {
                    throw new GraphQLError("You already have a purchase for this car.", {
                        extensions: { code: "CONFLICT" },
                    });
                }
                if (error instanceof GraphQLError) {
                    throw error;
                }
                throw new GraphQLError("Unexpected error while processing purchase.", {
                    extensions: { code: "INTERNAL_SERVER_ERROR" },
                });
            }
        },
        approvePurchase: async (_parent, { purchaseId }, context) => {
            await adminOrStaffMiddleware(context);
            //1. Get the purchase + related car
            const purchase = await context.prisma.purchase.findUnique({
                where: { id: purchaseId },
                include: { car: true },
            });
            if (!purchase)
                throw new GraphQLError("Purchase not found");
            if (purchase.status !== PurchaseStatus.PENDING) {
                throw new GraphQLError("Only pending purchases can be approved", {
                    extensions: { code: "BAD REQUEST" },
                });
            }
            //2. Transaction to ensure atomic updates
            const result = await context.prisma.$transaction(async (tx) => {
                //Approve the selected purchase
                const approvePurchase = await tx.purchase.update({
                    where: { id: purchaseId },
                    data: {
                        status: PurchaseStatus.CONFIRMED,
                        car: {
                            update: {
                                carStatus: CarStatus.SOLD,
                                availability: false,
                            },
                        },
                    },
                    include: { car: true },
                });
                //Reject all other pending purchases for the same car
                await tx.purchase.updateMany({
                    where: {
                        carId: purchase.carId,
                        status: PurchaseStatus.PENDING,
                        NOT: { id: purchaseId },
                    },
                    data: { status: PurchaseStatus.CANCELED },
                });
                return approvePurchase;
            });
            return result;
        },
        rejectPurchase: async (_parent, { purchaseId }, context) => {
            await adminOrStaffMiddleware(context);
            const purchase = await context.prisma.purchase.findUnique({
                where: { id: purchaseId },
                include: { car: true },
            });
            if (!purchase)
                throw new GraphQLError("Purchase not found");
            if (purchase.status !== PurchaseStatus.PENDING) {
                throw new GraphQLError("Only pending purchases can be rejected", {
                    extensions: { code: "BAD REQUEST" },
                });
            }
            return await context.prisma.purchase.update({
                where: { id: purchaseId },
                data: {
                    status: PurchaseStatus.CANCELED,
                    car: {
                        update: {
                            carStatus: CarStatus.AVAILABLE,
                            availability: true,
                        },
                    },
                },
                include: { car: true },
            });
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
