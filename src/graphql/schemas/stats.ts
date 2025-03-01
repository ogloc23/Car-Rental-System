import { gql } from "apollo-server-express";

export const countTypeDefs = gql`
  type Query {
    getDashboardStats: DashboardStats!
  }

  type DashboardStats {
    totalUsers: Int!
    totalCars: Int!
    totalBookings: Int!
  }
`;
