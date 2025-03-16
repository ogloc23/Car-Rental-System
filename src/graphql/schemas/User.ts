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
    verified: Boolean!
    verificationCode: String
    verificationCodeExpires: String
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type ActivityLog {
    id: ID!
    userId: ID!
    action: String!
    resourceType: String
    resourceId: String
    createdAt: String!
  }

  type MessageResponse {
    message: String!
  }

  type Query {
    me: User
    getUsers: [User!]!
    getStaff(id: ID!): User
    getStaffs: [User!]!
    getUserActivity(userId: ID!): [ActivityLog!]!
  }

  type Mutation {
    register(
      fullName: String!
      email: String!
      phoneNumber: String!
      address: String
      driversLicense: String!
      password: String!
      role: Role
    ): AuthPayload!

    registerAdmin(
      fullName: String!
      email: String!
      phoneNumber: String!
      address: String
      driversLicense: String!
      password: String!
    ): AuthPayload!

    registerStaff(
      fullName: String!
      email: String!
      phoneNumber: String!
      address: String
      driversLicense: String!
      password: String!
    ): User!

    login(email: String!, password: String!): AuthPayload!
    resetPassword(email: String!, newPassword: String!, code: String!): String!
    sendVerificationEmail(email: String!): MessageResponse! # New: Sends code
    verifyEmail(email: String!, code: String!): MessageResponse! # Verifies code
    deleteStaff(id: ID!): String!
  }
`;