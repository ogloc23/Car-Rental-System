import { gql } from "graphql-tag";
export const userTypeDefs = gql `
  enum Role {
    ADMIN
    USER
  }

  type User {
    id: ID!
    fullName: String!
    email: String!
    phoneNumber: String!
    address: String
    driversLicense: String!
    role: Role!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type Query {
    me: User
    getUsers: [User!]!
  }

  type Mutation {
    register(
      fullName: String!
      email: String!
      phoneNumber: String!
      address: String
      driversLicense: String!
      password: String!
      isAdmin: Boolean
    ): AuthPayload!

    registerAdmin(
      fullName: String!
      email: String!
      phoneNumber: String!
      address: String
      driversLicense: String!
      password: String!
    ): AuthPayload!  # ✅ Added registerAdmin mutation

    login(email: String!, password: String!): AuthPayload!
  }
`;
