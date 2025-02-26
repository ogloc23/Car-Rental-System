import { gql } from "apollo-server-express";

export const paymentTypeDefs = gql`
  type PaymentResponse {
    status: Boolean
    message: String
    data: PaymentData
  }

  type PaymentData {
    authorization_url: String
    access_code: String
    reference: String
    amount: Float
    currency: String
    status: String
    paid_at: String
    created_at: String
    gateway_response: String
    channel: String
    ip_address: String
    customer: Customer
  }

  type Customer {
    id: ID
    fullName: String
    email: String
    phoneNumber: String
  } 

  type Query {
    verifyPayment(reference: String!): PaymentResponse
  }

  type Mutation {
    initializePayment(email: String!, amount: Float!): PaymentResponse
  }
`;
