import { gql } from "graphql-tag";
export const bookingTypeDefs = gql `

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELED  # Ensure this matches Prisma (not CANCELLED)
  COMPLETED
}

type Booking {
  id: ID!
  user: User!
  car: Car!
  startDate: String!
  endDate: String!
  pickupLocation: String!  # Added
  dropoffLocation: String! # Added
  totalPrice: Float!
  status: BookingStatus!
  createdAt: String!
  updatedAt: String!
}

extend type Query {
  getBookings: [Booking!]! # Admin can fetch all bookings
  getUserBookings: [Booking!]! # Users can fetch their own bookings
  getBooking(id: ID!): Booking # Fetch a single booking by ID
}

extend type Mutation {
  createBooking(
    carId: ID!,
    startDate: String!,
    endDate: String!,
    pickupLocation: String!,  # Added
    dropoffLocation: String!  # Added
  ): Booking! # Users can create a booking

  updateBooking(id: ID!, status: BookingStatus!): Booking! # Admin can update booking status
  cancelBooking(id: ID!): Booking! # Users can cancel their own booking (returns success message)
}

`;
