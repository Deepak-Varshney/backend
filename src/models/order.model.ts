import { DataTypes, Model, Optional } from "sequelize";
import {sequelize} from "../config/database.js";
import cuid from "cuid";

export enum OrderStatus {
  PENDING = "PENDING",
  CANCELLED = "CANCELLED",
}

interface OrderAttributes {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
}

type OrderCreationAttributes = Optional<OrderAttributes, "id" | "status">;

class Order
  extends Model<OrderAttributes, OrderCreationAttributes>
  implements OrderAttributes
{
  declare id: string;
  declare userId: string;
  declare status: OrderStatus;
  declare totalAmount: number;
}

Order.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => cuid(),
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "CANCELLED"),
      defaultValue: OrderStatus.PENDING,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Order",
    tableName: "Orders",
    timestamps: true,
  }
);

export default Order;