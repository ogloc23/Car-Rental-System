

import jwt from "jsonwebtoken";
import { Context } from "../types/types.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DecodedToken {
  id: string;
  role: string;
}

export const authMiddleware = async (context: Context) => {
  try {
    const authHeader = context.req.headers.authorization;

    if (!authHeader) {
      console.warn("🚨 No Authorization Header Found");
      throw new Error("Unauthorized: No token provided.");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    console.log("🔑 Received Token:", token);

    if (!process.env.JWT_SECRET) {
      console.error("🚨 Missing JWT_SECRET in environment variables.");
      throw new Error("Internal server error: Missing authentication secret.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    console.log("✅ Decoded Token:", decoded);

    if (!decoded.id) {
      console.warn("❌ Token missing user ID.");
      throw new Error("Invalid token: Missing user id.");
    }

    // Fetch user from database with only necessary fields
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true },
    });

    if (!user) {
      console.warn("❌ User not found in database.");
      throw new Error("Unauthorized: User not found.");
    }

    // Attach user to context
    context.user = { id: user.id, role: user.role };
    console.log("✅ User Authenticated:", context.user);
  } catch (error) {
    console.error("🚨 Authentication Error:", error);
    throw new Error("Unauthorized: Invalid token.");
  }
};