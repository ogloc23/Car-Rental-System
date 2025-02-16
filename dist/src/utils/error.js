import { AuthenticationError } from "apollo-server-errors";
export const handleAuthorization = (user, requiredRole = null) => {
    if (!user) {
        throw new AuthenticationError("Unauthorized. Please log in.");
    }
    if (requiredRole && user.role !== requiredRole) {
        throw new AuthenticationError(`Access denied. Only ${requiredRole}s allowed.`);
    }
};
