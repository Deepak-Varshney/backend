import { DataTypes, Model, Optional } from "sequelize";
import {sequelize} from "../config/database.js";
import cuid from "cuid";

export enum MovementType {
  STOCK_IN = "STOCK_IN",
  ORDER_PLACED = "ORDER_PLACED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
}

interface StockMovementAttributes {
  id: string;
  productId: string;
  orderId?: string;
  movementType: MovementType;
  quantityChange: number;
  beforeQuantity: number;
  afterQuantity: number;
  notes?: string;
}

type StockMovementCreationAttributes = Optional<
  StockMovementAttributes,
  "id" | "orderId" | "notes"
>;

class StockMovement
  extends Model<
    StockMovementAttributes,
    StockMovementCreationAttributes
  >
  implements StockMovementAttributes
{
  declare id: string;
  declare productId: string;
  declare orderId?: string;
  declare movementType: MovementType;
  declare quantityChange: number;
  declare beforeQuantity: number;
  declare afterQuantity: number;
  declare notes?: string;
}

StockMovement.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => cuid(),
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    movementType: {
      type: DataTypes.ENUM(
        "STOCK_IN",
        "ORDER_PLACED",
        "ORDER_CANCELLED"
      ),
      allowNull: false,
    },
    quantityChange: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    beforeQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    afterQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "StockMovement",
    tableName: "StockMovements",
    timestamps: true,
    updatedAt: false,
  }
);

export default StockMovement;