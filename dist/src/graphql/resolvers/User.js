import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { adminMiddleware } from "../../middleware/adminMiddleware.js";
import { adminOrStaffMiddleware } from "../../middleware/adminOrStaffMiddleware.js";
const prisma = new PrismaClient();
export const userResolvers = {
    Query: {
        me: async (_, __, context) => {
            if (!context.user || !context.user.id) {
                throw new GraphQLError("❌ Not authenticated.", {
                    extensions: { code: "UNAUTHORIZED" },
                });
            }
            return prisma.user.findUnique({
                where: { id: context.user.id },
                select: { id: true, fullName: true, email: true, role: true },
            });
        },
        getUsers: async (_parent, _args, context) => {
            await adminOrStaffMiddleware(context);
            return prisma.user.findMany({
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    address: true,
                    driversLicense: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        },
        getStaffs: async (_parent, _args, context) => {
            await adminMiddleware(context);
            return prisma.user.findMany({
                where: { role: "STAFF" },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    address: true,
                    driversLicense: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        },
        getStaff: async (_parent, { id }, context) => {
            await adminMiddleware(context);
            const staff = await prisma.user.findUnique({
                where: { id, role: "STAFF" },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    address: true,
                    driversLicense: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!staff) {
                throw new GraphQLError("❌ Staff member not found.", {
                    extensions: { code: "NOT_FOUND" },
                });
            }
            return staff;
        },
    },
    Mutation: {
        registerAdmin: async (_parent, args, context) => {
            await adminMiddleware(context);
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email: args.email }, { phoneNumber: args.phoneNumber }, { driversLicense: args.driversLicense }],
                },
            });
            if (existingUser) {
                throw new Error("Email, phone number, or driver's license already registered.");
            }
            const hashedPassword = await bcrypt.hash(args.password, 10);
            const admin = await prisma.user.create({
                data: { ...args, password: hashedPassword, role: "ADMIN" },
            });
            const token = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return { user: admin, token };
        },
        registerStaff: async (_parent, args, context) => {
            await adminMiddleware(context);
            // Check if the user already exists
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: args.email },
                        { phoneNumber: args.phoneNumber },
                        { driversLicense: args.driversLicense },
                    ],
                },
            });
            if (existingUser) {
                throw new Error("Email, phone number, or driver's license already registered.");
            }
            // Hash password before saving
            const hashedPassword = await bcrypt.hash(args.password, 10);
            // Create staff
            const staff = await prisma.user.create({
                data: { ...args, password: hashedPassword, role: "STAFF" },
            });
            console.log("✅ Staff Registered:", staff); // Debugging log
            return staff; // ✅ Fix: Return the staff object directly
        },
        register: async (_parent, args) => {
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email: args.email }, { phoneNumber: args.phoneNumber }, { driversLicense: args.driversLicense }],
                },
            });
            if (existingUser) {
                throw new Error("Email, phone number, or driver's license already registered.");
            }
            const hashedPassword = await bcrypt.hash(args.password, 10);
            const user = await prisma.user.create({
                data: { ...args, password: hashedPassword, role: "USER" },
            });
            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return { user, token };
        },
        login: async (_parent, { email, password }) => {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new Error("Invalid email or password.");
            }
            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            return { token, user };
        },
        deleteStaff: async (_parent, { id }, context) => {
            await adminMiddleware(context);
            const staff = await prisma.user.findUnique({
                where: { id, role: "STAFF" },
            });
            if (!staff) {
                throw new GraphQLError("❌ Staff member not found.", {
                    extensions: { code: "NOT_FOUND" },
                });
            }
            await prisma.user.delete({ where: { id } });
            return "✅ Staff member deleted successfully.";
        },
    },
};
