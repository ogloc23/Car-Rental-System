// import { PrismaClient } from "@prisma/client";
// import { handleAuthorization } from "../../utils/error.js";
// const prisma = new PrismaClient();
// export const carResolvers = {
//   Query: {
//     getCars: async () => {
//       const cars = await prisma.car.findMany();
//       return cars.map(car => ({
//         ...car,
//         createdAt: new Date(car.createdAt).toLocaleString(),
//         updatedAt: new Date(car.updatedAt).toLocaleString(),
//       }));
//     },
//     getCar: async (_parent: any, { id }: { id: string }) => {
//       const car = await prisma.car.findUnique({ where: { id } });
//       if (!car) throw new Error("Car not found");
//       return {
//         ...car,
//         createdAt: new Date(car.createdAt).toLocaleString(),
//         updatedAt: new Date(car.updatedAt).toLocaleString(),
//       };
//     },
//   },
//   Mutation: {
//     addCar: async (_parent: any, args: any, context: any) => {
//       handleAuthorization(context.user, "ADMIN"); // Only admins can add cars
//       const { make, model, year, licensePlate, type, price, availability } = args;
//       if (!make || !model || !year || !licensePlate || !type || !price || availability === undefined) {
//         throw new Error("All car fields are required.");
//       }
//       return prisma.car.create({ data: args });
//     },
//     updateCar: async (_parent: any, { id, ...updates }: any, context: any) => {
//       handleAuthorization(context.user, "ADMIN"); // Only admins can update cars
//       const existingCar = await prisma.car.findUnique({ where: { id } });
//       if (!existingCar) throw new Error("Car not found");
//       return prisma.car.update({
//         where: { id },
//         data: {
//           ...updates,
//           updatedAt: new Date(), // Ensure updated timestamp
//         },
//       });
//     },
//     deleteCar: async (_parent: any, { id }: { id: string }, context: any) => {
//       handleAuthorization(context.user, "ADMIN"); // Only admins can delete cars
//       const existingCar = await prisma.car.findUnique({ where: { id } });
//       if (!existingCar) throw new Error("Car not found");
//       await prisma.car.delete({ where: { id } });
//       return "Car deleted successfully";
//     },
//   },
// };
import { PrismaClient } from "@prisma/client";
import { handleAuthorization } from "../../utils/error.js";
const prisma = new PrismaClient();
export const carResolvers = {
    Query: {
        getCars: async () => {
            const cars = await prisma.car.findMany();
            return cars.map((car) => ({
                ...car,
                createdAt: car.createdAt,
                updatedAt: car.updatedAt,
            }));
        },
        getCar: async (_parent, { id }) => {
            const car = await prisma.car.findUnique({ where: { id } });
            if (!car)
                throw new Error("Car not found");
            return {
                ...car,
                createdAt: car.createdAt,
                updatedAt: car.updatedAt,
            };
        },
    },
    Mutation: {
        addCar: async (_parent, args, context) => {
            handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can add cars
            return prisma.car.create({ data: args });
        },
        updateCar: async (_parent, { id, ...updates }, context) => {
            handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can update cars
            const existingCar = await prisma.car.findUnique({ where: { id } });
            if (!existingCar)
                throw new Error("Car not found");
            return prisma.car.update({
                where: { id },
                data: {
                    ...updates,
                    updatedAt: new Date(),
                },
            });
        },
        deleteCar: async (_parent, { id }, context) => {
            handleAuthorization(context.user ?? { role: "" }, "ADMIN"); // Only admins can delete cars
            const existingCar = await prisma.car.findUnique({ where: { id } });
            if (!existingCar)
                throw new Error("Car not found");
            return prisma.car.delete({ where: { id } });
        },
    },
};
