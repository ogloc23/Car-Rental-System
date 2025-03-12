import { GraphQLError } from "graphql";
import { authMiddleware } from "./authMiddleware.js";
import { Role } from "@prisma/client";
export const adminOrStaffMiddleware = async (context) => {
    await authMiddleware(context);
    if (context.user?.role !== Role.ADMIN && context.user?.role !== Role.STAFF) {
        throw new GraphQLError("Access denied. Admin or Staff privileges required.", {
            extensions: { code: "FORBIDDEN" },
        });
    }
};
