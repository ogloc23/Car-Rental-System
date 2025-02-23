import { bookingResolvers } from './resolvers/Booking.js';
import { carResolvers } from './resolvers/Car.js';
import { userResolvers } from './resolvers/User.js';
import { bookingTypeDefs } from './schemas/Booking.js';
import { carTypeDefs } from './schemas/Car.js';
import { userTypeDefs } from './schemas/User.js';
// Combine resolvers
const resolvers = [
    userResolvers,
    carResolvers, // Ensure carResolvers is included here
    bookingResolvers,
];
// Combine type definitions
const typeDefs = [
    userTypeDefs,
    carTypeDefs, // And carTypeDefs is included here
    bookingTypeDefs,
];
export { resolvers, typeDefs };
