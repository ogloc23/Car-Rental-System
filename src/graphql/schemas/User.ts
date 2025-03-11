import { gql } from "graphql-tag";

export const userTypeDefs = gql`
  enum Role {
    ADMIN
    USER
    STAFF
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
    getStaff(id: ID!): User
    getStaffs: [User!]!  # ✅ Added query to fetch all staff members
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

    registerStaff(
      fullName: String!
      email: String!
      phoneNumber: String!
      address: String
      driversLicense: String!
      password: String!
    ): User!  # ✅ Added registerStaff mutation

    login(email: String!, password: String!): AuthPayload!
    verifyEmail(code: String!): Boolean!
    deleteStaff(id: ID!): String!
  }
`;
