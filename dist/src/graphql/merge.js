import { bookingResolvers } from './resolvers/Booking.js';
import { carResolvers } from './resolvers/Car.js';
import { userResolvers } from './resolvers/User.js';
import { paymentResolvers } from './resolvers/Payment.js';
import { countResolvers } from './resolvers/stats.js';
import { paymentTypeDefs } from './schemas/Payment.js';
import { bookingTypeDefs } from './schemas/Booking.js';
import { carTypeDefs } from './schemas/Car.js';
import { userTypeDefs } from './schemas/User.js';
import { countTypeDefs } from './schemas/stats.js';
// Merge resolvers into a single object
const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...carResolvers.Query,
        ...bookingResolvers.Query,
        ...paymentResolvers.Query,
        ...countResolvers.Query, // Assuming countResolvers only has Query
    },
    Mutation: {
        ...userResolvers.Mutation,
        ...carResolvers.Mutation,
        ...bookingResolvers.Mutation,
        ...paymentResolvers.Mutation, // We’ll confirm Payment.ts has mutations
        // No Mutation for countResolvers since it doesn’t have one
    },
};
// Combine type definitions
const typeDefs = [
    userTypeDefs,
    carTypeDefs,
    bookingTypeDefs,
    paymentTypeDefs,
    countTypeDefs,
];
export { resolvers, typeDefs };
