import { DataTypes, Model, Optional } from "sequelize";
import {sequelize} from "../config/database.js";
import cuid from "cuid";

interface ProductAttributes {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
}

type ProductCreationAttributes = Optional<
  ProductAttributes,
  "id" | "description" | "stockQuantity"
>;

class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  declare id: string;
  declare sku: string;
  declare name: string;
  declare description?: string;
  declare price: number;
  declare stockQuantity: number;
}

Product.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: () => cuid(),
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "Products",
    timestamps: true,
  }
);

export default Product;