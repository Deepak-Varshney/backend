import { DataTypes, Model, Optional } from "sequelize";
import {sequelize} from "../config/database.js";
import cuid from "cuid";

interface OrderItemAttributes {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

type OrderItemCreationAttributes = Optional<OrderItemAttributes, "id">;

class OrderItem
  extends Model<OrderItemAttributes, OrderItemCreationAttributes>
  implements OrderItemAttributes
{
  declare id: string;
  declare orderId: string;
  declare productId: string;
  declare quantity: number;
  declare unitPrice: number;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => cuid(),
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "OrderItem",
    tableName: "OrderItems",
    timestamps: true,
    updatedAt: false,
  }
);

export default OrderItem;