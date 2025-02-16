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

// Initialize Express and Prisma
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

// Start Apollo Server
await server.start();

// Apply middleware
app.use("/graphql", expressMiddleware(server, { context }));

// Show database connection & timestamp in purple
const timestamp = new Date().toLocaleString();
console.log(`${purple}Connected to Database at: ${timestamp}${reset}`);

// Start Express server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`${purple}🚀 Server running on: http://localhost:${PORT}/graphql${reset}`);
});
