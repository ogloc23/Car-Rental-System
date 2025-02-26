import { PrismaClient, Car, Prisma, CarStatus } from "@prisma/client"; 
import { handleAuthorization } from "../../utils/error.js";
import { Context } from "../../types/types.js"; // Ensure Context includes { user?: User | null; prisma: PrismaClient }

const prisma = new PrismaClient();

export const carResolvers = {
  Query: {
    getCars: async (): Promise<Car[]> => {
      try {
        return await prisma.car.findMany();
      } catch (error) {
        console.error("Error fetching cars:", error);
        throw new Error("Failed to fetch cars.");
      }
    },

    getCar: async (_parent: unknown, { id }: { id: string }): Promise<Car> => {
      try {
        const car = await prisma.car.findUnique({ where: { id } });
        if (!car) throw new Error("Car not found");
        return car;
      } catch (error) {
        console.error("Error fetching car:", error);
        throw new Error("Failed to fetch car.");
      }
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
      }: {
        make: string;
        model: string;
        year: number;
        licensePlate: string;
        type: string;
        price: number;
        availability: boolean;
        carStatus: keyof typeof CarStatus; // ✅ Use Prisma's CarStatus enum correctly
        imageUrl?: string;
      },
      context: Context
    ): Promise<Car> => {
      handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can add cars

      try {
        // Check if a car with the same license plate already exists
        const existingCar = await prisma.car.findUnique({ where: { licensePlate } });

        if (existingCar) {
          throw new Error("A car with this license plate already exists.");
        }

        // Define the data explicitly
        const carData: Prisma.CarCreateInput = {
          make,
          model,
          year,
          licensePlate,
          type,
          price,
          availability,
          carStatus: CarStatus[carStatus as keyof typeof CarStatus], // ✅ Correctly map to Prisma enum
          imageUrl: imageUrl ?? null, // Ensure nullable field is handled correctly
        };

        return await prisma.car.create({ data: carData });
      } catch (error) {
        console.error("Error adding car:", error);
        throw new Error("Failed to add car. Please try again.");
      }
    },

    updateCar: async (
      _parent: unknown,
      { id, carStatus, ...updates }: { id: string } & Partial<Prisma.CarUpdateInput>,
      context: Context
    ): Promise<Car> => {
      handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can update cars

      try {
        const existingCar = await prisma.car.findUnique({ where: { id } });
        if (!existingCar) throw new Error("Car not found");

        return await prisma.car.update({
          where: { id },
          data: {
            ...updates,
            ...(carStatus ? { carStatus: CarStatus[carStatus as keyof typeof CarStatus] } : {}), // ✅ Ensure Prisma enum compatibility
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error("Error updating car:", error);
        throw new Error("Failed to update car. Please try again.");
      }
    },

    deleteCar: async (
      _parent: unknown,
      { id }: { id: string },
      context: Context
    ): Promise<Car> => {
      handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can delete cars

      try {
        const existingCar = await prisma.car.findUnique({ where: { id } });
        if (!existingCar) throw new Error("Car not found");

        return await prisma.car.delete({ where: { id } });
      } catch (error) {
        console.error("Error deleting car:", error);
        throw new Error("Failed to delete car. Please try again.");
      }
    },
  },
};
