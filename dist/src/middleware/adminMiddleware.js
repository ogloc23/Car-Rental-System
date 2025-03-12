import { GraphQLError } from "graphql";
import { authMiddleware } from "./authMiddleware.js";
import { Role } from "@prisma/client";
export const adminMiddleware = async (context) => {
    await authMiddleware(context);
    if (context.user?.role !== Role.ADMIN) {
        throw new GraphQLError("Access denied. Admin privileges required.", {
            extensions: { code: "FORBIDDEN" },
        });
    }
};
