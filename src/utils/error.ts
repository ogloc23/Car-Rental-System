import { AuthenticationError } from "apollo-server-errors";
import { Context } from "../types/types.js"; // Adjust path to your Context type

export const handleAuthorization = (
  context: Context,
  requiredRoles: string[] | string | null = null
) => {
  if (!context.user) {
    throw new AuthenticationError("Unauthorized. Please log in.");
  }

  if (requiredRoles) {
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!rolesArray.includes(context.user.role)) {
      throw new AuthenticationError(`Access denied. Requires one of: ${rolesArray.join(", ")}.`);
    }
  }
};