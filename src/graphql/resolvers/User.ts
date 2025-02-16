// // import { PrismaClient } from "@prisma/client";
// // import bcrypt from "bcryptjs";
// // import jwt from "jsonwebtoken";
// // import { handleAuthorization } from "../../utils/error.js"; // ✅ Import from utils
// // import { Context } from "../../types/types.js";

// // const prisma = new PrismaClient();

// // export const userResolvers = {
// //   Query: {
// //     me: async (_parent: any, _args: any, context: Context) => {
// //       if (!context.userId) throw new Error("Not authenticated");
// //       return await prisma.user.findUnique({ where: { id: context.userId } });
// //     },

// //     getUsers: async (_parent: any, _args: any, context: any) => {
// //       handleAuthorization(context.user, "ADMIN"); // Ensure only admins can fetch users

// //       const users = await prisma.user.findMany();
// //       return users.map(user => ({
// //         ...user,
// //         createdAt: new Date(user.createdAt).toLocaleString(), // Format the date
// //         updatedAt: new Date(user.updatedAt).toLocaleString(), // Format the date
// //       }));
// //     },
      
// //   },

// //   Mutation: {
    
// //     register: async (
// //       _parent: any,
// //       { fullName, email, phoneNumber, address, driversLicense, password }: 
// //       { fullName: string; email: string; phoneNumber: string; address?: string; driversLicense: string; password: string }
// //     ) => {
// //       const existingUser = await prisma.user.findFirst({
// //         where: { OR: [{ email }, { phoneNumber }, { driversLicense }] },
// //       });
    
// //       if (existingUser) throw new Error("Email, phone number, or driver's license already registered");
    
// //       const hashedPassword = await bcrypt.hash(password, 10);
    
// //       const user = await prisma.user.create({
// //         data: { fullName, email, phoneNumber, address, driversLicense, password: hashedPassword },
// //       });
    
// //       return { user }; // ✅ Returns an object with "user" key
// //     },
    

// //     login: async (_parent: any, { email, password }: { email: string; password: string }) => {
// //       const user = await prisma.user.findUnique({ where: { email } });
// //       if (!user) throw new Error("Invalid email or password");

// //       const valid = await bcrypt.compare(password, user.password);
// //       if (!valid) throw new Error("Invalid email or password");

// //       const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "vybz_kartel_2003", { expiresIn: "7d" });

// //       return { user, token };
// //     },
// //   },
// // };


// // import { PrismaClient } from "@prisma/client";
// // import bcrypt from "bcryptjs";
// // import jwt from "jsonwebtoken";
// // import { handleAuthorization } from "../../utils/error.js"; // ✅ Import from utils
// // import { Context } from "../../types/types.js";

// // const prisma = new PrismaClient();

// // export const userResolvers = {
// //   Query: {
// //     me: async (_parent: any, _args: any, context: Context) => {
// //       return context.userId
// //         ? await prisma.user.findUnique({ where: { id: context.userId } })
// //         : null; // ✅ Return null instead of throwing an error
// //     },

// //     getUsers: async (_parent: any, _args: any) => {
// //       return await prisma.user.findMany();
// //     },
// //   },

// //   Mutation: {
// //     register: async (
// //       _parent: any,
// //       {
// //         fullName,
// //         email,
// //         phoneNumber,
// //         address,
// //         driversLicense,
// //         password,
// //         role, // ✅ Allow explicit role setting
// //       }: {
// //         fullName: string;
// //         email: string;
// //         phoneNumber: string;
// //         address?: string;
// //         driversLicense: string;
// //         password: string;
// //         role?: "ADMIN" | "USER"; // ✅ Allow role input but default to USER
// //       }
// //     ) => {
// //       const existingUser = await prisma.user.findFirst({
// //         where: { OR: [{ email }, { phoneNumber }, { driversLicense }] },
// //       });

// //       if (existingUser)
// //         throw new Error("Email, phone number, or driver's license already registered");

// //       const hashedPassword = await bcrypt.hash(password, 10);

// //       // ✅ Check if this is the first user, make them ADMIN
// //       const userCount = await prisma.user.count();
// //       const assignedRole = userCount === 0 ? "ADMIN" : role || "USER";
// // // 
// //       const user = await prisma.user.create({
// //         data: {
// //           fullName,
// //           email,
// //           phoneNumber,
// //           address,
// //           driversLicense,
// //           password: hashedPassword,
// //           role: assignedRole, // ✅ Assign role dynamically
// //         },
// //       });

// //       return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
// //     },

// //     login: async (_parent: any, { email, password }: { email: string; password: string }) => {
// //       const user = await prisma.user.findUnique({ where: { email } });
// //       if (!user) throw new Error("Invalid email or password");

// //       const valid = await bcrypt.compare(password, user.password);
// //       if (!valid) throw new Error("Invalid email or password");

// //       const token = jwt.sign(
// //         { userId: user.id, role: user.role },
// //         process.env.JWT_SECRET || "vybz_kartel_2003",
// //         { expiresIn: "7d" }
// //       );

// //       return { token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } };
// //     },
// //   },
// // };

// import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { Context } from "../../types/types.js";

// const prisma = new PrismaClient();

// export const userResolvers = {
//   Mutation: {
//     registerAdmin: async (
//       _parent: any,
//       { fullName, email, phoneNumber, address, driversLicense, password }: 
//       { fullName: string; email: string; phoneNumber: string; address?: string; driversLicense: string; password: string },
//       context: Context
//     ) => {
//       // Check if an admin exists
//       const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

//       // If an admin exists, only another admin can create a new admin
//       if (existingAdmin && (!context.user || context.user.role !== "ADMIN")) {
//         throw new Error("Unauthorized: Only an admin can create another admin.");
//       }

//       // Check if email, phone, or license is already registered
//       const existingUser = await prisma.user.findFirst({
//         where: { OR: [{ email }, { phoneNumber }, { driversLicense }] },
//       });

//       if (existingUser) {
//         throw new Error("Email, phone number, or driver's license already registered.");
//       }

//       // Hash the password
//       const hashedPassword = await bcrypt.hash(password, 10);

//       // Create the admin user
//       const admin = await prisma.user.create({
//         data: {
//           fullName,
//           email,
//           phoneNumber,
//           address,
//           driversLicense,
//           password: hashedPassword,
//           role: "ADMIN", // Assigning admin role
//         },
//       });

//       // Generate JWT token
//       const token = jwt.sign(
//         { userId: admin.id, role: admin.role },
//         process.env.JWT_SECRET || "vybz_kartel_2003",
//         { expiresIn: "7d" }
//       );

//       return { user: admin, token };
//     },
//   },
// };

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Context } from "../../types/types.js";
import { adminMiddleware } from "../../middleware/adminMiddleware.js"; // Import admin middleware

const prisma = new PrismaClient();

export const userResolvers = {
  Mutation: {
    registerAdmin: async (
      _parent: any,
      { fullName, email, phoneNumber, address, driversLicense, password }: 
      { fullName: string; email: string; phoneNumber: string; address?: string; driversLicense: string; password: string },
      context: Context
    ) => {
      await adminMiddleware(context); // ✅ Protect admin registration

      // Check for duplicate email, phone number, or driver's license
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phoneNumber }, { driversLicense }] },
      });

      if (existingUser) {
        throw new Error("Email, phone number, or driver's license already registered.");
      }

      // Hash password before saving
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

      // Generate JWT Token
      const token = jwt.sign(
        { userId: admin.id, role: admin.role },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "7d" }
      );

      return { user: admin, token };
    },

    login: async (_parent: any, { email, password }: { email: string; password: string }) => {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        throw new Error("Invalid email or password.");
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error("Invalid email or password.");
      }

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "7d" }
      );

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
