import { validationResult } from "express-validator";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import {
  createCategory,
  createProduct,
  deleteProduct,
  getCategories,
  getProductById,
  getProducts,
  updateCategory,
  updateProduct,
} from "../services/productService.js";

const normaliseActive = (value, defaultValue = 1) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return value ? 1 : 0;
  }

  const lower = String(value).toLowerCase();
  if (lower === "true" || lower === "1") {
    return 1;
  }
  if (lower === "false" || lower === "0") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed ? 1 : 0;
};

const decodeImageUpload = async (imageUpload) => {
  if (!imageUpload || typeof imageUpload !== "object") {
    return null;
  }

  const { base64, mimeType, filename } = imageUpload;
  if (!base64) {
    return null;
  }

  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch (error) {
    throw new Error("No se pudo leer la imagen proporcionada");
  }

  if (!buffer.length) {
    throw new Error("La imagen proporcionada está vacía");
  }

  const maxSize = 5 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new Error("La imagen es demasiado grande (máx. 5MB)");
  }

  const uploadsDir = path.join(process.cwd(), "uploads", "products");
  await fs.mkdir(uploadsDir, { recursive: true });

  const extensionFromMime = mimeType?.split("/")[1];
  const originalExt = filename ? path.extname(filename) : "";
  const extension = (originalExt || (extensionFromMime ? `.${extensionFromMime}` : ".jpg")).toLowerCase();
  const uniqueName = `product-${Date.now()}-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, uniqueName);

  await fs.writeFile(filePath, buffer);
  return path.posix.join("uploads", "products", uniqueName);
};

const buildProductPayload = async (req, existingImageUrl = null) => {
  const name = req.body.name?.toString().trim() || "";
  const description = req.body.description?.toString().trim() || "";
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  const categoryId = Number(req.body.categoryId);
  const active = normaliseActive(req.body.active, 1);

  let imageUrl = req.body.imageUrl?.toString().trim() || "";
  if (req.body.imageUpload) {
    const savedPath = await decodeImageUpload(req.body.imageUpload);
    if (savedPath) {
      imageUrl = savedPath;
    }
  }

  if (!imageUrl && existingImageUrl) {
    imageUrl = existingImageUrl;
  }

  return {
    name,
    description,
    price,
    imageUrl,
    stock,
    categoryId,
    active,
  };
};

const removePreviousImage = async (imagePath) => {
  if (!imagePath || imagePath.startsWith("http")) {
    return;
  }

  const normalised = imagePath.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), normalised);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("No se pudo eliminar la imagen anterior", error.message);
    }
  }
};

export const listCategories = async (req, res) => {
  try {
    const categories = await getCategories();
    res.json({ categories });
  } catch (error) {
    console.error("Error obteniendo categorías", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const listProducts = async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    const includeInactive = normaliseActive(req.query.includeInactive, 0) === 1;
    const products = await getProducts({ categoryId, search, includeInactive });
    res.json({ products });
  } catch (error) {
    console.error("Error obteniendo productos", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const showProduct = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json({ product });
  } catch (error) {
    console.error("Error obteniendo producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createProductController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let payload;
  try {
    payload = await buildProductPayload(req);
  } catch (error) {
    return res.status(400).json({ message: error.message || "No se pudo procesar la imagen" });
  }

  try {
    const productId = await createProduct(payload);

    const product = await getProductById(productId);
    res.status(201).json({ product });
  } catch (error) {
    console.error("Error creando producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateProductController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const existing = await getProductById(id);
    if (!existing) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    let payload;
    try {
      payload = await buildProductPayload(req, existing.image_url);
    } catch (error) {
      return res.status(400).json({ message: error.message || "No se pudo procesar la imagen" });
    }
    if (payload.imageUrl !== existing.image_url && existing.image_url) {
      await removePreviousImage(existing.image_url);
    }

    await updateProduct(id, payload);
    const product = await getProductById(id);
    res.json({ product });
  } catch (error) {
    console.error("Error actualizando producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deleteProductController = async (req, res) => {
  try {
    const existing = await getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    await deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando producto", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createCategoryController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, active = 1 } = req.body;

  try {
    const categoryId = await createCategory({ name, description, active });
    const categories = await getCategories();
    res.status(201).json({ categoryId, categories });
  } catch (error) {
    console.error("Error creando categoría", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateCategoryController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, active } = req.body;

  try {
    await updateCategory(req.params.id, { name, description, active });
    const categories = await getCategories();
    res.json({ categories });
  } catch (error) {
    console.error("Error actualizando categoría", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
