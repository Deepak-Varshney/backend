import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

import Product from "../models/product.model.js";
import Order, { OrderStatus } from "../models/order.model.js";
import OrderItem from "../models/orderItem.model.js";
import StockMovement, {
  MovementType,
} from "../models/stockMovement.model.js";

import { AuthRequest } from "../middleware/auth.js";
import User from "../models/user.model.js";

export const placeOrder = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { items } = req.body;
    const userId = (req as AuthRequest).userId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Order must have at least one item",
      });
    }

    for (const item of items) {
      if (!item.productId || item.quantity == null) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Each order item requires a productId and quantity",
        });
      }

      const qty = Number(item.quantity);

      if (!Number.isInteger(qty) || qty < 1) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive integer",
        });
      }

      item.quantity = qty;
    }

    const uniqueProductIds = new Set<string>();

    for (const item of items) {
      if (uniqueProductIds.has(item.productId)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Duplicate products are not allowed in an order",
        });
      }

      uniqueProductIds.add(item.productId);
    }

    const productIds = items.map((item: any) => item.productId);

    const products = await Product.findAll({
      where: {
        id: {
          [Op.in]: productIds,
        },
      },
      transaction,
    });

    if (products.length !== productIds.length) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "One or more products not found",
      });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (product.stockQuantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Not enough stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
        });
      }
    }

    let totalAmount = 0;

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      totalAmount += Number(product.price) * item.quantity;
    }

    const newOrder = await Order.create(
      {
        userId,
        totalAmount,
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      items.map((item: any) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: productMap.get(item.productId)!.price,
      })),
      { transaction }
    );

    for (const item of items) {
      const product = productMap.get(item.productId)!;

      const beforeQuantity = product.stockQuantity;
      const afterQuantity = beforeQuantity - item.quantity;

      await product.update(
        {
          stockQuantity: afterQuantity,
        },
        { transaction }
      );

      await StockMovement.create(
        {
          productId: item.productId,
          orderId: newOrder.id,
          movementType: MovementType.ORDER_PLACED,
          quantityChange: -item.quantity,
          beforeQuantity,
          afterQuantity,
          notes: `Order ${newOrder.id} placed`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    const order = await Order.findByPk(newOrder.id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
            },
          ],
        },
      ],
    });

    return res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("placeOrder error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;

    const orders = await Order.findAll({
      where: { userId },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["name", "sku"],
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("getOrders error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const id = String(req.params.id);

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
            },
          ],
        },
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
        {
          model: StockMovement,
          as: "movements",
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("getOrder error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId } = req as AuthRequest;
    const id = String(req.params.id);


    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
        },
      ],
      transaction,
    });

    if (!order) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.userId !== userId) {
      await transaction.rollback();

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Only pending orders can be cancelled",
      });
    }

    await order.update(
      {
        status: OrderStatus.CANCELLED,
      },
      { transaction }
    );

    const items = order.get("items") as OrderItem[];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, {
        transaction,
      });

      if (!product) continue;

      const beforeQuantity = product.stockQuantity;
      const afterQuantity = beforeQuantity + item.quantity;

      await product.update(
        {
          stockQuantity: afterQuantity,
        },
        { transaction }
      );

      await StockMovement.create(
        {
          productId: item.productId,
          orderId: order.id,
          movementType: MovementType.ORDER_CANCELLED,
          quantityChange: item.quantity,
          beforeQuantity,
          afterQuantity,
          notes: `Order ${order.id} cancelled — stock restored`,
        },
        { transaction }
      );
    }

    await transaction.commit();

    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
            },
          ],
        },
      ],
    });

    return res.json({
      success: true,
      message: "Order cancelled and stock restored",
      data: updatedOrder,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("cancelOrder error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};