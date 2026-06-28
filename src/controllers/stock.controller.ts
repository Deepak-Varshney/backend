import { Request, Response } from "express";
import { sequelize } from "../config/database.js";
import Product from "../models/product.model.js";
import StockMovement, {
  MovementType,
} from "../models/stockMovement.model.js";
import Order from "../models/order.model.js";

export const addStock = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const productId = String(req.params.productId);
    const { quantity, notes } = req.body;

    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
      });
    }

    const product = await Product.findByPk(productId, { transaction });

    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const beforeQuantity = product.stockQuantity;
    const afterQuantity = beforeQuantity + qty;

    await product.update(
      { stockQuantity: afterQuantity },
      { transaction }
    );

    const movement = await StockMovement.create(
      {
        productId,
        movementType: MovementType.STOCK_IN,
        quantityChange: qty,
        beforeQuantity,
        afterQuantity,
        notes: notes ?? `Added ${qty} units`,
      },
      { transaction }
    );

    await transaction.commit();

    return res.json({
      success: true,
      message: `Stock updated: ${beforeQuantity} → ${afterQuantity}`,
      data: {
        product,
        movement,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  const transaction = await sequelize.transaction();

  try {
    const productId = String(req.params.productId);
    const { quantity, notes } = req.body;

    const qty = Number(quantity);

    if (!qty) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Adjustment quantity must not be zero",
      });
    }

    const product = await Product.findByPk(productId, { transaction });

    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const beforeQuantity = product.stockQuantity;
    const afterQuantity = beforeQuantity + qty;

    if (afterQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative",
      });
    }

    await product.update(
      {
        stockQuantity: afterQuantity,
      },
      { transaction }
    );

    const movement = await StockMovement.create(
      {
        productId,
        movementType: MovementType.STOCK_IN,
        quantityChange: qty,
        beforeQuantity,
        afterQuantity,
        notes:
          notes ??
          `Adjusted stock by ${qty > 0 ? "+" : ""}${qty}`,
      },
      { transaction }
    );

    await transaction.commit();

    return res.json({
      success: true,
      message: `Stock adjusted: ${beforeQuantity} → ${afterQuantity}`,
      data: {
        product,
        movement,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getStockHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const productId = String(req.params.productId);

    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const movements = await StockMovement.findAll({
      where: {
        productId,
      },
      include: [
        {
          model: Order,
          as: "order",
          attributes: ["id", "status"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: {
        product,
        movements,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getAllStockHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const movements = await StockMovement.findAll({
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "sku"],
        },
        {
          model: Order,
          as: "order",
          attributes: ["id", "status"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: movements,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};