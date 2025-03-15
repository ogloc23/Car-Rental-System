import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { adminMiddleware } from "../../middleware/adminMiddleware.js";
import { adminOrStaffMiddleware } from "../../middleware/adminOrStaffMiddleware.js";
import { sendEmail } from "../../utils/emailService.js";
import validator from "validator";
const prisma = new PrismaClient();
// Centralized activity logging helper
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
export const userResolvers = {
    Query: {
        me: async (_, __, context) => {
            if (!context.user || !context.user.id) {
                throw new GraphQLError("Not authenticated.", {
                    extensions: { code: "UNAUTHORIZED" },
                });
            }
            return prisma.user.findUnique({
                where: { id: context.user.id },
                select: { id: true, fullName: true, email: true, role: true },
            });
        },
        getUsers: async (_, __, context) => {
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
        getStaffs: async (_, __, context) => {
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
        getStaff: async (_, { id }, context) => {
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
                throw new GraphQLError("Staff member not found.", {
                    extensions: { code: "NOT_FOUND" },
                });
            }
            return staff;
        },
        getUserActivity: async (_, { userId }, context) => {
            if (!context.user) {
                throw new GraphQLError("Unauthorized access.", { extensions: { code: "UNAUTHORIZED" } });
            }
            const requestingUser = await prisma.user.findUnique({ where: { id: context.user.id } });
            if (!requestingUser) {
                throw new GraphQLError("User not found.", { extensions: { code: "NOT_FOUND" } });
            }
            if (requestingUser.role === "ADMIN") {
                return await prisma.activityLog.findMany({
                    orderBy: { createdAt: "desc" }, // Fixed: replaced timestamp with createdAt
                });
            }
            if (requestingUser.id !== userId) {
                throw new GraphQLError("You are not authorized to view these logs.", {
                    extensions: { code: "FORBIDDEN" },
                });
            }
            return await prisma.activityLog.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" }, // Fixed: replaced timestamp with createdAt
            });
        },
    },
    Mutation: {
        registerAdmin: async (_, args, context) => {
            await adminMiddleware(context);
            if (!validator.isEmail(args.email)) {
                throw new GraphQLError("Invalid email format.", { extensions: { code: "BAD_REQUEST" } });
            }
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email: args.email }, { phoneNumber: args.phoneNumber }, { driversLicense: args.driversLicense }],
                },
            });
            if (existingUser) {
                throw new GraphQLError("Email, phone number, or driver's license already registered.", {
                    extensions: { code: "BAD_REQUEST" },
                });
            }
            const hashedPassword = await bcrypt.hash(args.password, 10);
            const admin = await prisma.user.create({
                data: { ...args, password: hashedPassword, role: "ADMIN" },
            });
            const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            await logActivity(context.user.id, `Admin registered new admin: ${admin.email}`, "User", admin.id);
            return { user: admin, token };
        },
        registerStaff: async (_, args, context) => {
            await adminMiddleware(context);
            if (!validator.isEmail(args.email)) {
                throw new GraphQLError("Invalid email format.", { extensions: { code: "BAD_REQUEST" } });
            }
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email: args.email }, { phoneNumber: args.phoneNumber }, { driversLicense: args.driversLicense }],
                },
            });
            if (existingUser) {
                throw new GraphQLError("Email, phone number, or driver's license already registered.", {
                    extensions: { code: "BAD_REQUEST" },
                });
            }
            const hashedPassword = await bcrypt.hash(args.password, 10);
            const staff = await prisma.user.create({
                data: { ...args, password: hashedPassword, role: "STAFF" },
            });
            await logActivity(context.user.id, `Admin registered new staff: ${staff.email}`, "User", staff.id);
            return staff;
        },
        register: async (_, args) => {
            if (!validator.isEmail(args.email)) {
                throw new GraphQLError("Invalid email format.", { extensions: { code: "BAD_REQUEST" } });
            }
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [{ email: args.email }, { phoneNumber: args.phoneNumber }, { driversLicense: args.driversLicense }],
                },
            });
            if (existingUser) {
                throw new GraphQLError("Email, phone number, or driver's license already registered.", {
                    extensions: { code: "BAD_REQUEST" },
                });
            }
            if (!validator.isStrongPassword(args.password, { minLength: 8, minNumbers: 1, minUppercase: 1, minSymbols: 1 })) {
                throw new GraphQLError("Password must be at least 8 characters long and include at least 1 number, 1 uppercase letter, and 1 special character.", { extensions: { code: "BAD_REQUEST" } });
            }
            const hashedPassword = await bcrypt.hash(args.password, 10);
            let verified = true;
            if (!args.role || args.role === "USER") {
                verified = false; // USER starts unverified, no code yet
            }
            const user = await prisma.user.create({
                data: {
                    ...args,
                    password: hashedPassword,
                    role: args.role || "USER",
                    verified,
                    passwordUpdatedAt: new Date(),
                    // No verificationCode or verificationCodeExpires here
                },
            });
            await logActivity(user.id, `New ${user.role} registered: ${user.email}`, "User", user.id);
            return { user };
        },
        verifyEmail: async (_, { email, code }) => {
            if (!validator.isEmail(email)) {
                throw new GraphQLError("Invalid email format.", { extensions: { code: "BAD_REQUEST" } });
            }
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                throw new GraphQLError("User not found or email does not match registered email.", { extensions: { code: "NOT_FOUND" } });
            }
            // If no code provided, generate and send one
            if (!code) {
                const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
                const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
                await prisma.user.update({
                    where: { email },
                    data: { verificationCode, verificationCodeExpires },
                });
                await sendEmail(user.email, "Your Verification Code", `Your code: ${verificationCode} (expires in 10 minutes)`, undefined, user.id);
                return { message: "Verification code sent to your email." };
            }
            // If code provided, verify it
            if (!user.verificationCode || user.verificationCode !== code || !user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
                throw new GraphQLError("Invalid or expired verification code.", { extensions: { code: "BAD_REQUEST" } });
            }
            await prisma.user.update({
                where: { email },
                data: { verified: true, verificationCode: null, verificationCodeExpires: null },
            });
            await logActivity(user.id, "Email verified", "User", user.id);
            return { message: "Email verified successfully. You can now log in." };
        },
        login: async (_, { email, password }) => {
            if (!validator.isEmail(email)) {
                throw new GraphQLError("Invalid email format.", { extensions: { code: "BAD_REQUEST" } });
            }
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw new GraphQLError("Invalid email or password.", { extensions: { code: "UNAUTHORIZED" } });
            }
            // Removed verified check; moved to verifyEmail flow
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            if (user.passwordUpdatedAt < threeMonthsAgo) {
                throw new GraphQLError("Your password has expired. Please reset it.", { extensions: { code: "FORBIDDEN" } });
            }
            const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
            await logActivity(user.id, `${user.role} logged in`, "User", user.id);
            return { token, user };
        },
        resetPassword: async (_, { email, newPassword, code }) => {
            if (!validator.isEmail(email)) {
                throw new GraphQLError("Invalid email format.", { extensions: { code: "BAD_REQUEST" } });
            }
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                throw new GraphQLError("User not found.", { extensions: { code: "NOT_FOUND" } });
            }
            if (!user.verificationCode || user.verificationCode !== code || !user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
                throw new GraphQLError("Invalid or expired verification code.", { extensions: { code: "BAD_REQUEST" } });
            }
            if (!validator.isStrongPassword(newPassword, { minLength: 8, minNumbers: 1, minUppercase: 1, minSymbols: 1 })) {
                throw new GraphQLError("Password must be at least 8 characters long and include at least 1 number, 1 uppercase letter, and 1 special character.", { extensions: { code: "BAD_REQUEST" } });
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword, verificationCode: null, verificationCodeExpires: null, passwordUpdatedAt: new Date() },
            });
            await logActivity(user.id, "Password reset", "User", user.id);
            return "Password reset successful. You can now log in with your new password.";
        },
        deleteStaff: async (_, { id }, context) => {
            await adminMiddleware(context);
            const staff = await prisma.user.findUnique({
                where: { id, role: "STAFF" },
            });
            if (!staff) {
                throw new GraphQLError("Staff member not found.", { extensions: { code: "NOT_FOUND" } });
            }
            await prisma.user.delete({ where: { id } });
            await logActivity(context.user.id, `Admin deleted staff: ${staff.email}`, "User", id);
            return "Staff member deleted successfully.";
        },
    },
};
