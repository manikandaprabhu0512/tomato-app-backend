import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  clearCart,
  addToCart,
  decrementCartItem,
  fetchMyCart,
  incrementCartItem,
} from "../controllers/cart.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "cart" });
});

router.post("/add", isAuth, addToCart);
router.get("/all", isAuth, fetchMyCart);
router.put("/inc", isAuth, incrementCartItem);
router.put("/dec", isAuth, decrementCartItem);
router.delete("/clear", isAuth, clearCart);

export default router;
