// import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { GraphQLError } from "graphql";
// import { Context } from "../../types/types.js";
// import { adminMiddleware } from "../../middleware/adminMiddleware.js";
// const prisma = new PrismaClient();
// export const userResolvers = {
//   Query: {
//     me: async (_: any, __: any, context: Context) => {
//       console.log("🛠 Checking Context in me Resolver:", context.user);
//       if (!context.user) {
//         throw new GraphQLError("❌ Not authenticated.", {
//           extensions: { code: "UNAUTHORIZED" },
//         });
//       }
//       return context.user;
//     },
//     getUsers: async (_parent: any, _args: any, context: Context) => {
//       await adminMiddleware(context);
//       return prisma.user.findMany({
//         select: { id: true, fullName: true, email: true, role: true },
//       });
//     },
//   },
//   Mutation: {
//     registerAdmin: async (
//       _parent: any,
//       { fullName, email, phoneNumber, address, driversLicense, password }: 
//       { fullName: string; email: string; phoneNumber: string; address?: string; driversLicense: string; password: string },
//       context: Context
//     ) => {
//       await adminMiddleware(context); // ✅ Ensure only admins can create another admin
//       // ✅ Optimized: Check for existing user in a single query
//       const existingUser = await prisma.user.findFirst({
//         where: {
//           OR: [{ email }, { phoneNumber }, { driversLicense }],
//         },
//       });
//       if (existingUser) {
//         throw new Error("Email, phone number, or driver's license already registered.");
//       }
//       // ✅ Hash password securely
//       const hashedPassword = await bcrypt.hash(password, 10);
//       // ✅ Create new admin user
//       const admin = await prisma.user.create({
//         data: {
//           fullName,
//           email,
//           phoneNumber,
//           address,
//           driversLicense,
//           password: hashedPassword,
//           role: "ADMIN",
//         },
//       });
//       // ✅ Ensure JWT_SECRET is set
//       if (!process.env.JWT_SECRET) {
//         throw new Error("JWT_SECRET is missing in environment variables.");
//       }
//       // ✅ Generate JWT Token
//       const token = jwt.sign(
//         { userId: admin.id, role: admin.role },
//         process.env.JWT_SECRET || "vybz_kartel_2003",
//         { expiresIn: "7d" }
//       );
//       return { 
//         user: {
//           id: admin.id,
//           fullName: admin.fullName,
//           email: admin.email,
//           role: admin.role,
//         }, 
//         token 
//       };
//     },
//     register: async (
//       _parent: any,
//       { fullName, email, phoneNumber, address, driversLicense, password }: 
//       { fullName: string; email: string; phoneNumber: string; address?: string; driversLicense: string; password: string }
//     ) => {
//       // ✅ Check if the user already exists
//       const existingUser = await prisma.user.findFirst({
//         where: {
//           OR: [{ email }, { phoneNumber }, { driversLicense }],
//         },
//       });
//       if (existingUser) {
//         throw new Error("Email, phone number, or driver's license already registered.");
//       }
//       // ✅ Hash password
//       const hashedPassword = await bcrypt.hash(password, 10);
//       // ✅ Create new user
//       const user = await prisma.user.create({
//         data: {
//           fullName,
//           email,
//           phoneNumber,
//           address,
//           driversLicense,
//           password: hashedPassword,
//           role: "USER", // Regular users
//         },
//       });
//       if (!process.env.JWT_SECRET) {
//         throw new Error("JWT_SECRET is missing in environment variables.");
//       }
//       // ✅ Generate JWT Token
//       const token = jwt.sign(
//         { userId: user.id, role: user.role },
//         process.env.JWT_SECRET || "vybz_kartel_2003",
//         { expiresIn: "7d" }
//       );
//       return { 
//         user: {
//           id: user.id,
//           fullName: user.fullName,
//           email: user.email,
//           role: user.role,
//         }, 
//         token 
//       };
//     },
//     login: async (_parent: any, { email, password }: { email: string; password: string }) => {
//       const user = await prisma.user.findUnique({ where: { email } });
//       if (!user) {
//         throw new Error("Invalid email or password.");
//       }
//       const valid = await bcrypt.compare(password, user.password);
//       if (!valid) {
//         throw new Error("Invalid email or password.");
//       }
//       if (!process.env.JWT_SECRET) {
//         throw new Error("JWT_SECRET is missing in environment variables.");
//       }
//       // ✅ Generate JWT Token
//       const token = jwt.sign(
//         { userId: user.id, role: user.role },
//         process.env.JWT_SECRET || "vybz_kartel_2003",
//         { expiresIn: "7d" }
//       );
//       return { 
//         token, 
//         user: { 
//           id: user.id, 
//           fullName: user.fullName, 
//           email: user.email, 
//           role: user.role 
//         } 
//       };
//     },
//   },
// };
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { adminMiddleware } from "../../middleware/adminMiddleware.js";
const prisma = new PrismaClient();
export const userResolvers = {
    Query: {
        me: async (_, __, context) => {
            console.log("🛠 Checking Context in me Resolver:", context.user);
            if (!context.user || !context.user.id) {
                throw new GraphQLError("❌ Not authenticated.", {
                    extensions: { code: "UNAUTHORIZED" },
                });
            }
            const user = await prisma.user.findUnique({
                where: { id: context.user.id }, // Now, id is properly recognized
                select: { id: true, fullName: true, email: true, role: true },
            });
            if (!user) {
                throw new GraphQLError("❌ User not found.", {
                    extensions: { code: "NOT_FOUND" },
                });
            }
            return user;
        },
        getUsers: async (_parent, _args, context) => {
            await adminMiddleware(context);
            return prisma.user.findMany({
                select: { id: true, fullName: true, email: true, role: true },
            });
        },
    },
    Mutation: {
        registerAdmin: async (_parent, { fullName, email, phoneNumber, address, driversLicense, password }, context) => {
            await adminMiddleware(context);
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email }, { phoneNumber }, { driversLicense }],
                },
            });
            if (existingUser) {
                throw new Error("Email, phone number, or driver's license already registered.");
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const admin = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    phoneNumber,
                    address,
                    driversLicense,
                    password: hashedPassword,
                    role: "ADMIN",
                },
            });
            const token = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return {
                user: {
                    id: admin.id,
                    fullName: admin.fullName,
                    email: admin.email,
                    role: admin.role,
                },
                token
            };
        },
        register: async (_parent, { fullName, email, phoneNumber, address, driversLicense, password }) => {
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email }, { phoneNumber }, { driversLicense }],
                },
            });
            if (existingUser) {
                throw new Error("Email, phone number, or driver's license already registered.");
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    phoneNumber,
                    address,
                    driversLicense,
                    password: hashedPassword,
                    role: "USER",
                },
            });
            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                },
                token
            };
        },
        login: async (_parent, { email, password }) => {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new Error("Invalid email or password.");
            }
            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return {
                token,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role
                }
            };
        },
    },
};
