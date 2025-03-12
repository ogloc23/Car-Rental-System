import { gql } from "graphql-tag";
export const userTypeDefs = gql `
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
    verified: Boolean!          # Added to match schema.prisma
    verificationCode: String    # Added (nullable)
    verificationCodeExpires: String # Added (nullable)
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
    createdAt: String!          # Changed from timestamp to match schema.prisma
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
    verifyEmail(email: String!, code: String!): MessageResponse!
    deleteStaff(id: ID!): String!
  }
`;
