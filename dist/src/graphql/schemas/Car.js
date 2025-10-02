// import { gql } from "graphql-tag"; 
// export const carTypeDefs = gql`
//   enum CarStatus {
//     AVAILABLE
//     RENTED
//     MAINTENANCE
//     SOLD
//   }
//   enum PurchaseStatus {
//     PENDING
//     CANCELED
//     COMPLETED
//     CONFIRMED
//   }
//   type Car {
//     id: ID!
//     make: String!
//     model: String!
//     year: Int!
//     licensePlate: String!
//     type: String!
//     price: Float!
//     availability: Boolean!
//     description: String!
//     carStatus: CarStatus!
//     imageUrl: String
//     createdAt: String!
//     updatedAt: String!
//   }
//   type User {
//     id: ID!
//     fullName: String!
//     email: String!
//     phoneNumber: String!
//   }
//   type Purchase {
//     id: ID!
//     fullName: String!
//     email: String!
//     phoneNumber: String!
//     price: Float!
//     status: String!
//     createdAt: String!
//     car: Car!
//     user: User   # 👈 will be null for guest purchases
//   }
//   type Query {
//     getCars: [Car!]!
//     getCar(id: ID!): Car
//     purchases(status: PurchaseStatus): [Purchase!]!
//   }
//   type Mutation {
//     addCar(
//       make: String!
//       model: String!
//       year: Int! 
//       licensePlate: String!
//       type: String!
//       price: Float!
//       availability: Boolean
//       description: String!
//       carStatus: CarStatus
//       imageUrl: String
//     ): Car!
//     updateCar(
//       id: ID!
//       make: String
//       model: String
//       year: Int
//       licensePlate: String
//       type: String
//       price: Float
//       availability: Boolean
//       description: String
//       carStatus: CarStatus
//       imageUrl: String
//     ): Car!
//     deleteCar(id: ID!): Car!
//     buyCar(
//       carId: ID!
//       fullName: String   # 👈 optional now
//       phoneNumber: String # 👈 optional now
//       email: String       # 👈 optional now
//     ): Purchase!
//     approvePurchase(purchaseId: ID!): Purchase!
//     rejectPurchase(purchaseId: ID!): Purchase!
//   }
// `;
import { gql } from "graphql-tag";
export const carTypeDefs = gql `
  enum CarStatus {
    AVAILABLE
    RENTED
    MAINTENANCE
    SOLD
    ORDERED
  }

  enum PurchaseStatus {
    PENDING
    CANCELED
    COMPLETED
    CONFIRMED
  }

  # 👇 Represents the group of identical cars (inventory level)
  type CarGroup {
    id: ID!
    make: String!
    model: String!
    year: Int!
    type: String!
    price: Float!
    count: Int!          # how many are left
    available: Boolean!  # group availability
    createdAt: String!
    updatedAt: String!
    cars: [Car!]!        # all cars in this group
  }

  # 👇 Represents an individual car
  type Car {
    id: ID!
    licensePlate: String!
    description: String!
    make: String!       
    model: String!
    year: Int!
    type: String!
    price: Float!
    carStatus: CarStatus!
    imageUrl: String
    createdAt: String!
    updatedAt: String!
    group: CarGroup!     # link to its group
  }

  type User {
    id: ID!
    fullName: String!
    email: String!
    phoneNumber: String!
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
    user: User
  }

  type Query {
    getCars: [Car!]!
    getCar(id: ID!): Car
    getCarGroups: [CarGroup!]!   # 👈 NEW: inventory-level view
    getAvailableCarGroups: [CarGroup!]!   # 👈 NEW
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
    ): Car!

    updateCar(
      id: ID!
      licensePlate: String
      description: String
      carStatus: CarStatus
      imageUrl: String
    ): Car!

    deleteCar(id: ID!): Car!

    buyCar(
      carId: ID!
      fullName: String
      phoneNumber: String
      email: String
    ): Purchase!

    approvePurchase(purchaseId: ID!): Purchase!
    rejectPurchase(purchaseId: ID!): Purchase!
  }
`;
