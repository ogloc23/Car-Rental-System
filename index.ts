import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from 'apollo-server-express';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers, typeDefs } from './src/graphql/merge.js';
import { context } from './src/graphql/context.js';
import paymentRoutes from './src/routes/paymentRoute.js';
import webhookRoutes from './src/routes/webhookRoute.js';
import { PrismaClient } from '@prisma/client';
import { ApolloServerPluginLandingPageGraphQLPlayground, Context } from 'apollo-server-core';

dotenv.config();

const purple = '\x1b[35m';
const reset = '\x1b[0m';

const prisma = new PrismaClient();
const app = express();
app.use(cors({ origin: [ 
  process.env.CORS_ORIGIN || 'https://rentals-admin.vercel.app', 'http://localhost:3001', "*"
],
  credentials: true,
 }));
app.use(express.json());
app.use('/payment/callback', paymentRoutes);
app.use('/payment/webhook', webhookRoutes);

const mergedTypeDefs = mergeTypeDefs(typeDefs);

const schema = makeExecutableSchema({ typeDefs: mergedTypeDefs, resolvers });

const server = new ApolloServer<Context>({
  schema,
  context,
  introspection: true,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  cache: 'bounded', // Added
  formatError: (error) => {
    console.error(`${purple}❌ GraphQL Error:${reset}`, {
      message: error.message,
      path: error.path,
      locations: error.locations,
      extensions: error.extensions,
    });
    return error;
  },
});

async function startServer() {
  try {
    console.log(`🚀 Running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`${purple}⏳ Connecting to database...${reset}`);
    await prisma.$connect();

    await server.start();
    server.applyMiddleware({ app, path: '/graphql', cors: false });

    const timestamp = new Date().toLocaleString();
    console.log(`${purple}✅ Connected to database at: ${timestamp}${reset}`);

    const PORT = process.env.PORT || 4000;
    const serverURL = process.env.SERVER_URL || `http://localhost:${PORT}`;

    app.listen(PORT, () => {
      console.log(`${purple}🚀 Server running on: ${serverURL}${server.graphqlPath}${reset}`);
      console.log(`${purple}🔗 Payment callback: ${serverURL}/payment/callback${reset}`);
      console.log(`${purple}🔗 Payment webhook: ${serverURL}/payment/webhook${reset}`);
    });

    process.on('SIGTERM', async () => {
      console.log(`${purple}⏳ Shutting down...${reset}`);
      await server.stop();
      await prisma.$disconnect();
      console.log(`${purple}✅ Server and database disconnected${reset}`);
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log(`${purple}⏳ Shutting down (Ctrl+C)...${reset}`);
      await server.stop();
      await prisma.$disconnect();
      console.log(`${purple}✅ Server and database disconnected${reset}`);
      process.exit(0);
    });
  } catch (error) {
    console.error('🚨 Server failed to start:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error('🚨 Unhandled error in startServer:', err);
  process.exit(1);
});