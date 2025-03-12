import { gql } from "graphql-tag";
export const carTypeDefs = gql `
  enum CarStatus {
    AVAILABLE
    RENTED
    MAINTENANCE  # Updated to match Prisma
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
    description: String!
    carStatus: CarStatus!
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getCars: [Car!]!
    getCar(id: ID!): Car  # Kept nullable since resolver can throw NOT_FOUND
  }

  type Mutation {
    addCar(
      make: String!
      model: String!
      year: Int!
      licensePlate: String!
      type: String!
      price: Float!
      availability: Boolean
      description: String!
      carStatus: CarStatus
      imageUrl: String
    ): Car!  # Non-nullable since resolver creates or throws

    updateCar(
      id: ID!
      make: String
      model: String
      year: Int
      licensePlate: String
      type: String
      price: Float
      availability: Boolean
      description: String
      carStatus: CarStatus
      imageUrl: String
    ): Car!  # Non-nullable since resolver updates or throws

    deleteCar(id: ID!): Car!  # Non-nullable since resolver deletes or throws
  }
`;
