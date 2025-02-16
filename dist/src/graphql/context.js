import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const context = async ({ req }) => {
    const token = req.headers.authorization?.split(" ")[1];
    let user;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("✅ Decoded Token:", decoded);
            if (!decoded.id) {
                console.error("🚨 Invalid Token Payload (Missing id)");
                return { req, user: undefined, prisma };
            }
            const foundUser = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, role: true },
            });
            if (foundUser) {
                user = foundUser;
            }
            else {
                console.error("🚨 User not found in DB.");
            }
        }
        catch (error) {
            console.error("🚨 Invalid token", error);
        }
    }
    return { req, user, prisma };
};
