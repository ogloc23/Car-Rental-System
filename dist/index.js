import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import jwt from "jsonwebtoken";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { typeDefs } from "./graphql/merge.js";
import { resolvers } from "./graphql/merge.js";
import { PrismaClient } from "@prisma/client";
dotenv.config();
// ANSI escape code for purple color
const purple = "\x1b[35m";
const reset = "\x1b[0m";
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
});
await server.start();
app.use("/graphql", expressMiddleware(server, {
    context: async ({ req }) => {
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await prisma.user.findUnique({ where: { id: decoded.id } });
                return { user, prisma };
            }
            catch (error) {
                console.error("Invalid token", error);
            }
        }
        return { prisma }; // No token, just return Prisma instance
    }
}));
// Show database connection & timestamp in purple
const timestamp = new Date().toLocaleString();
console.log(`${purple}Connected to Database at: ${timestamp}${reset}`);
app.listen(4000, () => {
    console.log(`${purple}🚀 Server running on: http://localhost:4000/graphql${reset}`);
});
