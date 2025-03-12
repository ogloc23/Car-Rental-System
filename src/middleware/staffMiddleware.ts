import { GraphQLError } from "graphql";
import { authMiddleware } from "./authMiddleware.js";
import { Context } from "../types/types.js";
import { Role } from "@prisma/client";

export const staffMiddleware = async (context: Context) => {
  await authMiddleware(context);
  if (context.user?.role !== Role.STAFF) {
    throw new GraphQLError("Access denied. Staff privileges required.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
};