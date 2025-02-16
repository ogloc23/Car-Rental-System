import { authMiddleware } from "../middleware/authMiddleware.js";
export const adminMiddleware = async (context) => {
    await authMiddleware(context); // Ensure the user is authenticated
    if (context.user?.role !== "ADMIN") {
        throw new Error("Access denied. Admin privileges required.");
    }
};
