import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const context = async ({ req }) => {
    const token = req.headers.authorization?.split(" ")[1];
    let user;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const foundUser = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, role: true }, // Only selecting necessary fields
            });
            if (foundUser) {
                user = foundUser;
            }
        }
        catch (error) {
            console.error("Invalid token", error);
        }
    }
    return { req, user, prisma };
};
