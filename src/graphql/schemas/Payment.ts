import { gql } from "graphql-tag";

export const paymentTypeDefs = gql`
  type Payment {
    id: ID!
    userId: ID!
    reference: String!
    email: String!
    amount: Float!
    currency: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type PaymentResponse {
    status: Boolean!
    message: String!
    data: Payment
  }

  type PaymentInitializationResponse {
    paymentUrl: String!  # Renamed from authorization_url for clarity
    reference: String!   # Matches Paystack's reference
  }

  type Query {
    verifyPayment(reference: String!): PaymentResponse!
  }

  type Mutation {
    initializePayment(bookingId: ID!): PaymentInitializationResponse!
  }
`;