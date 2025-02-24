import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./src/graphql/merge.js";
import { resolvers } from "./src/graphql/merge.js";
import { context } from "./src/graphql/context.js";
import { PrismaClient } from "@prisma/client";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

// Load environment variables
dotenv.config();

// ANSI escape codes for colored logs
const purple = "\x1b[35m";
const reset = "\x1b[0m";

// Initialize Prisma Client
const prisma = new PrismaClient();

// Initialize Express
const app: Application = express();
app.use(cors());
app.use(express.json());

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  introspection: process.env.NODE_ENV !== "production", // Enable Playground only in dev
  plugins:
    process.env.NODE_ENV !== "production"
      ? [ApolloServerPluginLandingPageGraphQLPlayground()]
      : [],
  persistedQueries: false, // 🚀 Disable persisted queries to avoid DoS risk
  formatError: (error) => {
    console.error(`${purple}❌ GraphQL Error:${reset}`, error);
    return {
      message: error.message,
      path: error.path,
      locations: error.locations,
      extensions: error.extensions,
    };
  },
});


// Start Apollo Server
async function startServer() {
  try {
    console.log(`🚀 Running in ${process.env.NODE_ENV || "development"} mode`);
    console.log(`${purple}⏳ Connecting to database...${reset}`);
    await prisma.$connect();

    await server.start();
    server.applyMiddleware({ app });

    const timestamp = new Date().toLocaleString();
    console.log(`${purple}✅ Connected to database at: ${timestamp}${reset}`);

    // Start Express server
    const PORT = process.env.PORT || 4000;
    const serverURL = process.env.SERVER_URL || `http://localhost:${PORT}`;

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
