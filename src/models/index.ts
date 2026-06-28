import { sequelize } from "../config/database.js";

import User from "./user.model.js";
import Product from "./product.model.js";
import Order from "./order.model.js";
import OrderItem from "./orderItem.model.js";
import StockMovement from "./stockMovement.model.js";

// Associations
User.hasMany(Order, {
  foreignKey: "userId",
  as: "orders",
});

Order.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Product.hasMany(OrderItem, {
  foreignKey: "productId",
  as: "orderItems",
});

OrderItem.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

Order.hasMany(OrderItem, {
  foreignKey: "orderId",
  as: "items",
});

OrderItem.belongsTo(Order, {
  foreignKey: "orderId",
  as: "order",
});

Product.hasMany(StockMovement, {
  foreignKey: "productId",
  as: "movements",
});

StockMovement.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
});

Order.hasMany(StockMovement, {
  foreignKey: "orderId",
  as: "movements",
});

StockMovement.belongsTo(Order, {
  foreignKey: "orderId",
  as: "order",
});

await sequelize.authenticate();
console.log("✅ Database connected");

// Fresh database
await sequelize.sync({ force: true });

console.log("✅ All tables created");