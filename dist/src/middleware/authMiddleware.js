import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const authMiddleware = async (context) => {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
        console.log("🚨 No Authorization Header Found");
        throw new Error("Unauthorized: No token provided.");
    }
    const token = authHeader.replace("Bearer ", "").trim();
    console.log("🔑 Received Token:", token); // ✅ Log token for debugging
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "vybz_kartel_2003");
        console.log("✅ Decoded Token:", decoded); // ✅ Log decoded payload
        if (!decoded.id) {
            console.log("❌ Token missing id");
            throw new Error("Invalid token: Missing user id");
        }
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true }, // ✅ Select only necessary fields
        });
        if (!user) {
            console.log("❌ User not found in database.");
            throw new Error("Unauthorized: User not found.");
        }
        // ✅ Attach user to context
        context.user = { id: user.id, role: user.role };
        console.log("✅ User Authenticated:", context.user);
    }
    catch (error) {
        console.log("🚨 Token Verification Failed:", error);
        throw new Error("Unauthorized: Invalid token.");
    }
};
