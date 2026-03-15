import express from "express";
import { addUserRole, loginUser, myProfile } from "../controllers/auth.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "auth" });
});

router.post("/login", loginUser);
router.put("/add/role", isAuth, addUserRole);
router.get("/me", isAuth, myProfile);

export default router;
