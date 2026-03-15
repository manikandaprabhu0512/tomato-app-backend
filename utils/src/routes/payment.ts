import express from "express";
import {
  createRazorpayOrder,
  payWithStripe,
  verifyRazorpayPayment,
  verifyStripe,
} from "../controllers/payment.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "payment" });
});

router.post("/create", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);
router.post("/stripe/create", payWithStripe);
router.post("/stripe/verify", verifyStripe);

export default router;
