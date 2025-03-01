import { bookingResolvers } from './resolvers/Booking.js';
import { carResolvers } from './resolvers/Car.js';
import { userResolvers } from './resolvers/User.js';
import { paymentResolvers } from './resolvers/Payment.js';
import { countResolvers} from './resolvers/stats.js';

import { paymentTypeDefs } from './schemas/Payment.js';
import { bookingTypeDefs } from './schemas/Booking.js';
import { carTypeDefs } from './schemas/Car.js';
import { userTypeDefs } from './schemas/User.js';
import { countTypeDefs } from './schemas/stats.js';

// Combine resolvers
const resolvers = [
  userResolvers,
  carResolvers, // Ensure carResolvers is included here
  bookingResolvers,
  paymentResolvers,
  countResolvers,
];

// Combine type definitions
const typeDefs = [
  userTypeDefs,
  carTypeDefs, // And carTypeDefs is included here
  bookingTypeDefs,
  paymentTypeDefs,
  countTypeDefs,
];

export { resolvers, typeDefs };
