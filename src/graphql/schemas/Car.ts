import { gql } from "graphql-tag";

export const carTypeDefs = gql`
  enum CarStatus {
    AVAILABLE
    RENTED
    MAINTENANCE  # Updated to match Prisma
    SOLD
  }

  enum PurchaseStatus {
    PENDING
    CANCELED
    COMPLETED
    CONFIRMED  # Updated to match Prisma
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

  type Purchase {
    id: ID!
    fullName: String!
    email: String!
    phoneNumber: String!
    price: Float!
    status: String!
    createdAt: String!
    car: Car!
  }

  type Query {
    getCars: [Car!]!
    getCar(id: ID!): Car  # Kept nullable since resolver can throw NOT_FOUND
    purchases(status: PurchaseStatus): [Purchase!]!
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

    buyCar(
      carId: ID!
      fullName: String!
      phoneNumber: String!
      email: String!
    ): Purchase!

    approvePurchase(purchaseId: ID!): Purchase!
    rejectPurchase(purchaseId: ID!): Purchase!
  }
`;