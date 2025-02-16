import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("adminpassword", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      fullName: "Admin User",
      email: "admin@example.com",
      phoneNumber: "0987654321",
      address: "Admin HQ",
      driversLicense: "XYZ123456",
      password: hashedPassword,
      role: "ADMIN", // Ensure enum is used correctly
    },
  });

  console.log("✅ Admin user seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding admin:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
