import { Request, Response } from "express";
import Product from "../models/product.model.js";
import StockMovement from "../models/stockMovement.model.js";
import Order from "../models/order.model.js";
import OrderItem from "../models/orderItem.model.js";

export const getProducts = async (_req: Request, res: Response) => {
  try {
    const products = await Product.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("getProducts error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const product = await Product.findByPk(id, {
      include: [
        {
          model: StockMovement,
          as: "movements",
          limit: 10,
          separate: true,
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("getProduct error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { sku, name, description, price } = req.body;

    const priceNum = Number(price);

    if (!sku || !name || Number.isNaN(priceNum)) {
      return res.status(400).json({
        success: false,
        message: "SKU, name and valid price are required",
      });
    }

    if (priceNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    const existing = await Product.findOne({
      where: { sku },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "SKU already exists",
      });
    }

    const product = await Product.create({
      sku,
      name,
      description,
      price: priceNum,
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("createProduct error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};


export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const { sku, name, description, price } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (sku && sku !== product.sku) {
      const skuExists = await Product.findOne({
        where: { sku },
      });

      if (skuExists) {
        return res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    const data: any = {};

    if (sku !== undefined) data.sku = sku;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    if (price !== undefined) {
      const priceNum = Number(price);

      if (Number.isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be greater than 0",
        });
      }

      data.price = priceNum;
    }

    await product.update(data);

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("updateProduct error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const orderCount = await Order.count({
      include: [
        {
          model: OrderItem,
          as: "items",
          where: {
            productId: id,
          },
          required: true,
        },
      ],
    });

    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product with existing orders",
      });
    }

    await product.destroy();

    return res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    console.error("deleteProduct error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};