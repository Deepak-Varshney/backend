import { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middleware/auth.js";

export const placeOrder = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const userId = (req as AuthRequest).userId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: "Order must have at least one item" });
      return;
    }
    for (const item of items) {
      if (!item.productId || item.quantity == null) {
        res.status(400).json({
          success: false,
          message: "Each order item requires a productId and quantity",
        });
        return;
      }

      const qty = Number(item.quantity);

      if (!Number.isInteger(qty) || qty < 1) {
        res.status(400).json({
          success: false,
          message: "Quantity must be a positive integer",
        });
        return;
      }

      item.quantity = qty;
    }
    const uniqueProductIds = new Set<string>();

    for (const item of items) {
      if (uniqueProductIds.has(item.productId)) {
        res.status(400).json({
          success: false,
          message: "Duplicate products are not allowed in an order",
        });
        return;
      }

      uniqueProductIds.add(item.productId);
    }
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      res.status(404).json({ success: false, message: "One or more products not found" });
      return;
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        res.status(404).json({
          success: false,
          message: "Product not found",
        });
        return;
      }

      if (product.stockQuantity < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Not enough stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
        });
        return;
      }
    }

    // calculate total
    let totalAmount = 0;
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      totalAmount += Number(product.price) * item.quantity;
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: productMap.get(item.productId)!.price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const beforeQuantity = product.stockQuantity;
        const afterQuantity = beforeQuantity - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: afterQuantity },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            orderId: newOrder.id,
            movementType: "ORDER_PLACED",
            quantityChange: -item.quantity,
            beforeQuantity,
            afterQuantity,
            notes: `Order ${newOrder.id} placed`,
          },
        });
      }

      return newOrder;
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("placeOrder error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("getOrders error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const getOrder = async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  try {
    const id = req.params.id as string;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        user: { select: { name: true, email: true } },
        movements: true,
      },
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (order.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "Access denied",
      });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("getOrder error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthRequest;
    const id = req.params.id as string;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (order.userId !== userId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    if (order.status !== "PENDING") {
      res.status(400).json({
        success: false,
        message: "Only pending orders can be cancelled",
      });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
        include: { items: { include: { product: true } } },
      });

      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const beforeQuantity = product!.stockQuantity;
        const afterQuantity = beforeQuantity + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: afterQuantity },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            movementType: "ORDER_CANCELLED",
            quantityChange: item.quantity,
            beforeQuantity,
            afterQuantity,
            notes: `Order ${order.id} cancelled — stock restored`,
          },
        });
      }

      return cancelled;
    });

    res.json({ success: true, message: "Order cancelled and stock restored", data: updatedOrder });
  } catch (error) {
    console.error("cancelOrder error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
