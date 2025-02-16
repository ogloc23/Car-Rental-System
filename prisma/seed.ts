import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding admin user...");

  try {
    const hashedPassword = await bcrypt.hash("adminpassword", 10);

    const admin = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {}, // No updates required; only creates if not existing
      create: {
        fullName: "Admin User",
        email: "admin@example.com",
        phoneNumber: "0987654321",
        address: "Admin HQ",
        driversLicense: "XYZ123456",
        password: hashedPassword,
        role: "ADMIN", // Ensure correct enum usage
      },
    });

    console.log("✅ Admin user seeded successfully:", admin);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1); // Exit the process with failure
  } finally {
    await prisma.$disconnect();
  }
}

main();
