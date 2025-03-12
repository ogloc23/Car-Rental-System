import { gql } from "graphql-tag";

export const bookingTypeDefs = gql`
  enum BookingStatus {
    PENDING
    CONFIRMED
    CANCELED
    COMPLETED
  }

  type Booking {
    id: ID!
    user: User!
    car: Car!
    startDate: String!
    endDate: String!
    pickupLocation: String!
    dropoffLocation: String!
    totalPrice: Float!
    status: BookingStatus!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getBookings: [Booking!]!
    getUserBookings: [Booking!]!
    getBooking(id: ID!): Booking
  }

  type Mutation {
    createBooking(
      carId: ID!
      startDate: String!
      endDate: String!
      pickupLocation: String!
      dropoffLocation: String!
    ): Booking!

    updateBooking(id: ID!, status: BookingStatus!): Booking!
    cancelBooking(id: ID!): Booking!
  }
`;