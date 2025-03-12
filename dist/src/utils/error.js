import { AuthenticationError } from "apollo-server-errors";
export const handleAuthorization = (context, requiredRoles = null) => {
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
