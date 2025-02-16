import { authMiddleware } from "../../middleware/authMiddleware.js";
import { Context } from "../../types/types.js";

export const adminMiddleware = async (context: Context) => {
  await authMiddleware(context); // Ensure the user is authenticated

  if (context.user?.role !== "ADMIN") {
    throw new Error("Access denied. Admin privileges required.");
  }
};
