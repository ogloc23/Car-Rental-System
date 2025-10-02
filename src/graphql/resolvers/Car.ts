import { PrismaClient, Car, Prisma, CarStatus, Purchase, PurchaseStatus } from "@prisma/client";
import { Context } from "../../types/types.js";
import { adminOrStaffMiddleware } from "../../middleware/adminOrStaffMiddleware.js";
import { GraphQLError } from "graphql";
import { context } from "../context.js";

const prisma = new PrismaClient();

// Centralized activity logging helper (copied from User.ts)
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

export const carResolvers = {
  Query: {
    getCars: async (): Promise<Car[]> => {
      try {
        return await prisma.car.findMany({
          include: {
            group: true
          }
        });
      } catch (error) {
        console.error("Error fetching cars:", error);
        throw new GraphQLError("Failed to fetch cars.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
      }
    },

    getCar: async (_parent: unknown, { id }: { id: string }): Promise<Car> => {
      try {
        const car = await prisma.car.findUnique({
          where: { id },
          include: {
            group: true
          }
        });
        if (!car) throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
        return car;
      } catch (error) {
        console.error("Error fetching car:", error);
        throw new GraphQLError("Failed to fetch car.", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
      }
    },

    getAvailableCarGroups: async () => {
      try {
        return await prisma.carGroup.findMany({
          where: { available: true, count: { gt: 0 } },
          include: { cars: true },
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        console.error("Error fetching available car groups:", error);
        throw new GraphQLError("Failed to fetch available car groups.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },


    purchases: async (_parent: unknown, {
      status
    }: { status?: PurchaseStatus },
      context: Context
    ) => {
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
    addCar: async (
      _parent: unknown,
      {
        make,
        model,
        year,
        licensePlate,
        type,
        price,
        availability,
        carStatus,
        imageUrl,
        description,
      }: {
        make: string;
        model: string;
        year: number;
        licensePlate: string;
        type: string;
        price: number;
        availability: boolean;
        carStatus: keyof typeof CarStatus;
        imageUrl?: string;
        description: string;
      },
      context: Context
    ): Promise<Car> => {
      await adminOrStaffMiddleware(context);

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

        // 1. Check if CarGroup already exists
        let carGroup = await prisma.carGroup.findFirst({
          where: {
            make,
            model,
            year,
            type,
          },
        });

        if (carGroup) {
          // 2. Increment count if group exists
          carGroup = await prisma.carGroup.update({
            where: { id: carGroup.id },
            data: {
              count: { increment: 1 },
              available: true,
            },
          });
        } else {
          // 3. Create a new group if it doesn’t exist
          carGroup = await prisma.carGroup.create({
            data: {
              make,
              model,
              year,
              type,
              price,
              count: 1,
              available: true,
            },
          });
        }

        // 4. Create the new Car tied to the group
        const car = await prisma.car.create({
          data: {
            make,
            model,
            year,
            type,
            price,
            licensePlate,
            description,
            imageUrl: imageUrl ?? null,
            carStatus: CarStatus[carStatus as keyof typeof CarStatus],
            groupId: carGroup.id,
          },
          include: {
            group: { include: { cars: true } },
          }
        });

        // 5. Log the action
        await logActivity(context.user.id, `Added car: ${make} ${model}`, "Car", car.id);

        return car;
      } catch (error) {
        console.error("Error adding car:", error);
        throw new GraphQLError("Failed to add car. Please try again.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },


    buyCar: async (
      _parent: unknown,
      {
        carId,
        fullName,
        phoneNumber,
        email,
      }: {
        carId: string;
        fullName?: string;
        phoneNumber?: string;
        email?: string;
      },
      context: Context
    ): Promise<Purchase> => {
      try {
        return await prisma.$transaction(async (tx) => {
          // 1. Fetch the car + its group
          let car = await tx.car.findUnique({
            where: { id: carId },
            include: { group: true },
          });
          if (!car) {
            throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
          }

          // 2. Ensure car is AVAILABLE
          if (car.carStatus !== CarStatus.AVAILABLE) {
            throw new GraphQLError("Car is not available for purchase.", {
              extensions: { code: "BAD_REQUEST" },
            });
          }

          // 3. Determine buyer details
          let buyerFullName: string;
          let buyerEmail: string;
          let buyerPhone: string;
          let userId: string | null = null;

          if (context.user) {
            const dbUser = await tx.user.findUnique({
              where: { id: context.user.id },
              select: { id: true, fullName: true, email: true, phoneNumber: true },
            });

            if (!dbUser) {
              throw new GraphQLError("Authenticated user not found in database.", {
                extensions: { code: "NOT_FOUND" },
              });
            }

            userId = dbUser.id;
            buyerFullName = dbUser.fullName;
            buyerEmail = dbUser.email;
            buyerPhone = dbUser.phoneNumber;
          } else {
            if (!fullName || !email || !phoneNumber) {
              throw new GraphQLError(
                "Guests must provide fullName, phoneNumber, and email to purchase a car.",
                { extensions: { code: "BAD_REQUEST" } }
              );
            }

            // 🔍 Check for duplicate guest purchase
            const existingGuestPurchase = await tx.purchase.findFirst({
              where: {
                carId,
                OR: [{ email }, { phoneNumber }],
                status: { in: [PurchaseStatus.PENDING, PurchaseStatus.CONFIRMED] },
              },
            });

            if (existingGuestPurchase) {
              throw new GraphQLError(
                "You already have a purchase for this car with the same email or phone number.",
                { extensions: { code: "CONFLICT" } }
              );
            }

            buyerFullName = fullName;
            buyerEmail = email;
            buyerPhone = phoneNumber;
          }

          // 4. Create the purchase
          const purchase = await tx.purchase.create({
            data: {
              carId,
              userId,
              fullName: buyerFullName,
              email: buyerEmail,
              phoneNumber: buyerPhone,
              price: car.group.price, // 👈 use group price
            },
            include: { car: true, user: true },
          });

          // 5. Mark this car as SOLD
          await tx.car.update({
            where: { id: carId },
            data: { carStatus: CarStatus.ORDERED },
          });

          // 6. Decrement group count
          const newCount = car.group.count--;
          await tx.carGroup.update({
            where: { id: car.groupId },
            data: {
              count: newCount,
              available: newCount > 0,
            },
          });

          return purchase;
        });
      } catch (error: any) {
        console.error("Error buying car:", error);

        if (error.code === "P2002") {
          throw new GraphQLError("You already have a purchase for this car.", {
            extensions: { code: "CONFLICT" },
          });
        }
        if (error instanceof GraphQLError) throw error;

        throw new GraphQLError("Unexpected error while processing purchase.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },


    approvePurchase: async (_parent: unknown,
      { purchaseId }: { purchaseId: string },
      context: Context
    ) => {
      await adminOrStaffMiddleware(context);
      //1. Get the purchase + related car
      const purchase = await context.prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: { car: true },
      });
      if (!purchase) throw new GraphQLError("Purchase not found");

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

    rejectPurchase: async (_parent: unknown,
      { purchaseId }: { purchaseId: string },
      context: Context
    ) => {
      await adminOrStaffMiddleware(context);

      const purchase = await context.prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: { car: true },
      });
      if (!purchase) throw new GraphQLError("Purchase not found");
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
            },
          },
        },
        include: { car: true },
      });
    },

    updateCar: async (
      _parent: unknown,
      { id, carStatus, description, ...updates }: { id: string } & Partial<Prisma.CarUpdateInput>,
      context: Context
    ): Promise<Car> => {
      await adminOrStaffMiddleware(context); // Ensures context.user exists

      if (!context.user) {
        throw new GraphQLError("Unexpected error: User not authenticated after middleware.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }

      try {
        const existingCar = await prisma.car.findUnique({
          where: { id },
          include: { group: true }  // Include group to access make/model for logging
        });
        if (!existingCar) {
          throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
        }

        const updatedCar = await prisma.car.update({
          where: { id },
          data: {
            ...updates,
            ...(carStatus ? { carStatus: CarStatus[carStatus as keyof typeof CarStatus] } : {}),
            ...(description ? { description } : {}),
            updatedAt: new Date(),
          },
        });

        // Log the action (only if status or description changes, for example)
        if (carStatus || description) {
          await logActivity(
            context.user.id,
            `Updated car: ${existingCar.group.make} ${existingCar.group.model} (Status: ${carStatus || existingCar.carStatus})`,
            "Car",
            id
          );
        }

        return updatedCar;
      } catch (error) {
        console.error("Error updating car:", error);
        throw new GraphQLError("Failed to update car. Please try again.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },

    deleteCar: async (_parent: unknown, { id }: { id: string }, context: Context): Promise<Car> => {
      await adminOrStaffMiddleware(context); // Ensures context.user exists

      if (!context.user) {
        throw new GraphQLError("Unexpected error: User not authenticated after middleware.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }

      try {
        const existingCar = await prisma.car.findUnique({
          where: { id },
          include: { group: true }  // Include group to access make/model for logging
        });
        if (!existingCar) {
          throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
        }

        const deletedCar = await prisma.car.delete({ where: { id } });

        // Log the action
        await logActivity(context.user.id, `Deleted car: ${existingCar.group.make} ${existingCar.group.model}`, "Car", id);

        return deletedCar;
      } catch (error) {
        console.error("Error deleting car:", error);
        throw new GraphQLError("Failed to delete car. Please try again.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};