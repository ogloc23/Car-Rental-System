import { authMiddleware } from "../middleware/authMiddleware.js"; 
import { Context } from "../types/types.js";
import { Role } from "@prisma/client";

export const adminOrStaffMiddleware = async (context: Context) => {
  await authMiddleware(context); // Ensure the user is authenticated

  if (context.user?.role !== Role.ADMIN && context.user?.role !== Role.STAFF) {
    throw new Error("Access denied. Admin or Staff privileges required.");
  }
};
