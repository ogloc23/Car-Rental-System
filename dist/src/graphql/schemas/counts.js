import { gql } from "apollo-server-express";
export const typeDefs = gql `
  type Query {
    getDashboardStats: DashboardStats!
  }

  type DashboardStats {
    totalUsers: Int!
    totalCars: Int!
    totalBookings: Int!
  }
`;
