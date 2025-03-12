import { GraphQLError } from "graphql";
export const authMiddleware = async (context) => {
    if (!context.user || !context.user.id) {
        console.warn("🚨 No authenticated user in context.");
        throw new GraphQLError("Unauthorized: No token provided or invalid.", {
            extensions: { code: "UNAUTHORIZED" },
        });
    }
    console.log("✅ User Authenticated:", context.user);
};
