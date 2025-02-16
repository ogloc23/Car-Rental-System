// import { AuthenticationError } from "apollo-server-errors";

// /**
//  * Ensures that a user is authenticated and has the required role.
//  * @param {Object} user - The user object from the context.
//  * @param {string} requiredRole - The role required to access the resource.
//  */
// export const handleAuthorization = (user?: { role: string }, requiredRole: string | null = null) => {
//   if (!user) {
//     throw new AuthenticationError("Unauthorized. Please log in.");
//   }

//   if (requiredRole && user?.role !== requiredRole) {
//     throw new AuthenticationError(`Access denied. Only ${requiredRole}s allowed.`);
//   }
// };

// export { AuthenticationError };
import { AuthenticationError } from "apollo-server-errors";

export const handleAuthorization = (user: { role: string }, requiredRole: string | null = null) => {
  if (!user) {
    throw new AuthenticationError("Unauthorized. Please log in.");
  }

  if (requiredRole && user.role !== requiredRole) {
    throw new AuthenticationError(`Access denied. Only ${requiredRole}s allowed.`);
  }
};
