import { DEFAULT_GRAPH_ORDER_LIMIT } from '../statistics/index.js';

/** Read-only analytical API; CRUD, authentication and sessions stay on REST. */
export const typeDefs = /* GraphQL */ `
  enum Currency {
    UAH
    USD
  }

  enum GraphNodeKind {
    WAREHOUSE
    ORDER
    PRODUCT_TYPE
  }

  type TypeCount {
    type: String!
    productsCount: Int!
  }

  type WarehouseStatistics {
    "Null for the products of orders without a warehouse."
    warehouseId: Int
    name: String
    productsCount: Int!
    value: Float!
    missingPrices: Int!
  }

  type InventoryStatistics {
    currency: Currency!
    ordersCount: Int!
    productsCount: Int!
    value: Float!
    "Products without a price in the selected currency; they are not counted in any value."
    missingPrices: Int!
    byType: [TypeCount!]!
    byWarehouse: [WarehouseStatistics!]!
  }

  type GraphNode {
    id: ID!
    kind: GraphNodeKind!
    "Null for the node of orders without a warehouse."
    label: String
    "Products connected to the node inside the returned graph."
    productsCount: Int!
  }

  type GraphEdge {
    id: ID!
    source: ID!
    target: ID!
    productsCount: Int!
  }

  type InventoryGraph {
    nodes: [GraphNode!]!
    edges: [GraphEdge!]!
    ordersTotal: Int!
    ordersShown: Int!
  }

  type Query {
    inventoryStatistics(currency: Currency = UAH): InventoryStatistics!
    "Warehouse -> order -> product type, limited to the orders with the most products."
    inventoryGraph(limit: Int = ${DEFAULT_GRAPH_ORDER_LIMIT}): InventoryGraph!
  }
`;
