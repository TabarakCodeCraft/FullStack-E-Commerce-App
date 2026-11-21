import { Router } from "express";
import { getCategory, getProductBySlug, listProducts } from "../controllers/productController";

const router = Router();

router.get("/", listProducts)
router.get("/categories", getCategory)
router.get("/:slug", getProductBySlug)

export default router