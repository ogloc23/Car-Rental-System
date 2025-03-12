import { GraphQLError } from "graphql";
import { Context } from "../types/types.js";

export const authMiddleware = async (context: Context) => {
  if (!context.user || !context.user.id) {
    console.warn("🚨 No authenticated user in context.");
    throw new GraphQLError("Unauthorized: No token provided or invalid.", {
      extensions: { code: "UNAUTHORIZED" },
    });
  }
  console.log("✅ User Authenticated:", context.user);
};