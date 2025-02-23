import { gql } from "graphql-tag";
export const carTypeDefs = gql `
  type Car {
    id: ID!
    make: String!
    model: String!
    year: Int!
    licensePlate: String!
    type: String!
    price: Float!
    availability: Boolean!
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
      availability: Boolean!
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
    ): Car!

    deleteCar(id: ID!): Car
  }
`;
