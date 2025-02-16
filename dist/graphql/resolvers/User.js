import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { adminMiddleware } from "../../middleware/adminMiddleware.js";
const prisma = new PrismaClient();
export const userResolvers = {
    Query: {
        me: async (_parent, _args, context) => {
            console.log("🛠 Checking Context in me Resolver:", context.user);
            if (!context.user) {
                console.log("❌ Not authenticated.");
                throw new Error("Unauthorized: Not authenticated.");
            }
            const user = await prisma.user.findUnique({
                where: { id: context.user.id },
                select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            });
            if (!user) {
                console.log(`❌ User not found for ID: ${context.user.id}`);
                throw new Error("User not found.");
            }
            console.log("✅ User found:", user);
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
            await adminMiddleware(context); // ✅ Ensure only admins can create another admin
            // ✅ Optimized: Check for existing user in a single query
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email }, { phoneNumber }, { driversLicense }],
                },
            });
            if (existingUser) {
                throw new Error("Email, phone number, or driver's license already registered.");
            }
            // ✅ Hash password securely
            const hashedPassword = await bcrypt.hash(password, 10);
            // ✅ Create new admin user
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
            // ✅ Ensure JWT_SECRET is set
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is missing in environment variables.");
            }
            // ✅ Generate JWT Token
            const token = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET || "vybz_kartel_2003", { expiresIn: "7d" });
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
            // ✅ Check if the user already exists
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email }, { phoneNumber }, { driversLicense }],
                },
            });
            if (existingUser) {
                throw new Error("Email, phone number, or driver's license already registered.");
            }
            // ✅ Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            // ✅ Create new user
            const user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    phoneNumber,
                    address,
                    driversLicense,
                    password: hashedPassword,
                    role: "USER", // Regular users
                },
            });
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is missing in environment variables.");
            }
            // ✅ Generate JWT Token
            const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "vybz_kartel_2003", { expiresIn: "7d" });
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
            if (!user) {
                throw new Error("Invalid email or password.");
            }
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                throw new Error("Invalid email or password.");
            }
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is missing in environment variables.");
            }
            // ✅ Generate JWT Token
            const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "vybz_kartel_2003", { expiresIn: "7d" });
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
