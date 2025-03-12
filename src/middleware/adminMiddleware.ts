import { GraphQLError } from "graphql";
import { authMiddleware } from "./authMiddleware.js";
import { Context } from "../types/types.js";
import { Role } from "@prisma/client";

export const adminMiddleware = async (context: Context) => {
  await authMiddleware(context);
  if (context.user?.role !== Role.ADMIN) {
    throw new GraphQLError("Access denied. Admin privileges required.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
};