import { gql } from "graphql-tag";
export const carTypeDefs = gql `
  enum CarStatus {
    AVAILABLE
    RENTED
    UNDER_MAINTENANCE
  }

  type Car {
    id: ID!
    make: String!
    model: String!
    year: Int!
    licensePlate: String!
    type: String!
    price: Float!
    availability: Boolean!
    carStatus: CarStatus!
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getCars: [Car!]!  # Fetch all cars
    getCar(id: ID!): Car  # Fetch a single car by ID
  }

  type Mutation {
    addCar(
      make: String!
      model: String!
      year: Int!
      licensePlate: String!
      type: String!
      price: Float!
      availability: Boolean  # Optional
      carStatus: CarStatus  # ✅ Added carStatus
      imageUrl: String
    ): Car!

    updateCar(
      id: ID!
      make: String
      model: String
      year: Int
      licensePlate: String
      type: String
      price: Float
      availability: Boolean
      carStatus: CarStatus  # ✅ Allows updating carStatus
      imageUrl: String
    ): Car!

    deleteCar(id: ID!): Car
  }
`;
