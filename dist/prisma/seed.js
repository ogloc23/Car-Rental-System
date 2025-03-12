import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();
const purple = "\x1b[35m";
const reset = "\x1b[0m";
const prisma = new PrismaClient();
async function main() {
    console.log(`${purple}🚀 Seeding admin user...${reset}`);
    try {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "SecureAdminPass123!";
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: {
                fullName: "Admin User",
                email: adminEmail,
                phoneNumber: "0987654321",
                address: "Admin HQ",
                driversLicense: "XYZ123456",
                password: hashedPassword,
                passwordUpdatedAt: new Date(), // Explicitly set
                verified: false,
                verificationCode: null,
                verificationCodeExpires: null,
                role: "ADMIN",
            },
        });
        const activityLog = await prisma.activityLog.create({
            data: {
                userId: admin.id,
                action: "Admin user seeded",
                resourceType: "User",
                resourceId: admin.id,
            },
        });
        console.log(`${purple}✅ Admin user seeded successfully:${reset}`, admin);
        console.log(`${purple}✅ Activity log created:${reset}`, activityLog);
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            console.error(`${purple}❌ Seeding failed: Unique constraint violation (e.g., email or driversLicense already exists)${reset}`, error);
        }
        else {
            console.error(`${purple}❌ Error seeding admin:${reset}`, error);
        }
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
