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
    status: Boolean!
    message: String!
    data: PaymentInitializationData
  }

  type PaymentInitializationData {
    authorization_url: String!
    access_code: String!
    reference: String!
  }

  type Query {
    verifyPayment(reference: String!): PaymentResponse!
  }

  type Mutation {
    initializePayment(email: String!, amount: Float!): PaymentInitializationResponse!
  }
`;