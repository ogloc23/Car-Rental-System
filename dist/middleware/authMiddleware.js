import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const authMiddleware = async (context) => {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
        throw new Error("Unauthorized: No token provided.");
    }
    const token = authHeader.replace("Bearer ", "");
    try {
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || "vybz_kartel_2003");
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            throw new Error("Unauthorized: User not found.");
        }
        context.user = { id: user.id, role: user.role }; // ✅ Attach user to context
    }
    catch (error) {
        throw new Error("Unauthorized: Invalid token.");
    }
    finally {
        await prisma.$disconnect();
    }
};
