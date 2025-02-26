import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function testConnection() {
    try {
        await prisma.$connect();
        console.log("✅ Successfully connected to the database!");
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testConnection();
