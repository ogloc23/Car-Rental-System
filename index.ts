import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { typeDefs } from "./src/graphql/merge.js";
import { resolvers } from "./src/graphql/merge.js";
import { context } from "./src/graphql/context.js"; // Import context from separate file
import { PrismaClient } from "@prisma/client";

// Load environment variables
dotenv.config();

// ANSI escape codes for purple color
const purple = "\x1b[35m";
const reset = "\x1b[0m";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // ✅ Enable GraphQL Playground & Schema Introspection in production
  formatError: (error) => {
    console.error("❌ GraphQL Error:", error);
    return error;
  },
});

// Start Apollo Server
async function startServer() {
  try {
    await server.start();
    app.use("/graphql", expressMiddleware(server, { context }));

    // Show database connection & timestamp in purple
    const timestamp = new Date().toLocaleString();
    console.log(`${purple}✅ Connected to Database at: ${timestamp}${reset}`);

    // Start Express server
    const PORT = process.env.PORT || 10000;
    const serverURL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

    app.listen(PORT, () => {
      console.log(`${purple}🚀 Server running on: ${serverURL}/graphql${reset}`);
    });

  } catch (error) {
    console.error("🚨 Server failed to start:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
