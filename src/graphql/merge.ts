import { carResolvers } from './resolvers/Car.js';
import { userResolvers } from './resolvers/User.js';
import { carTypeDefs } from './schemas/Car.js';
import { userTypeDefs } from './schemas/User.js';

// Combine resolvers
const resolvers = [
  userResolvers,
  carResolvers, // Ensure carResolvers is included here
];

// Combine type definitions
const typeDefs = [
  userTypeDefs,
  carTypeDefs, // And carTypeDefs is included here
];

export { resolvers, typeDefs };
