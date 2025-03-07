import { authMiddleware } from "../middleware/authMiddleware.js";
import { Role } from "@prisma/client";
export const adminMiddleware = async (context) => {
    await authMiddleware(context); // Ensure the user is authenticated
    if (context.user?.role !== Role.ADMIN) {
        throw new Error("Access denied. Admin privileges required.");
    }
};
