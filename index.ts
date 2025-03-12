import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./src/graphql/merge.js"; // Updated extension
import { resolvers } from "./src/graphql/merge.js";
import { context } from "./src/graphql/context.js";
import { PrismaClient } from "@prisma/client";
import paystackWebhook from "./src/routes/webhookRoute.js";
import paymentRoute from "./src/routes/paymentRoute.js";
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
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" })); // Configurable origin
app.use(express.json());
app.use("/payment", paystackWebhook);
app.use("/payment", paymentRoute);

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  introspection: true,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
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

    const PORT = process.env.PORT || 4000;
    const serverURL = process.env.SERVER_URL || `http://localhost:${PORT}`;

    app.listen(PORT, () => {
      console.log(`${purple}🚀 Server running on: ${serverURL}/graphql${reset}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log(`${purple}⏳ Shutting down...${reset}`);
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("🚨 Server failed to start:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();