import express from "express";
import {
  addUserRole,
  loginUser,
  loginWithEmailPassword,
  loginWithPhoneNumber,
  myProfile,
  signupUser,
} from "../controllers/auth.js";
import { isAuth } from "../middlewares/isAuth.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "auth" });
});

router.post("/login", loginUser);
router.post("/login/email", loginWithEmailPassword);
router.post("/login/phone", loginWithPhoneNumber);
router.post("/signup", signupUser);
router.put("/add/role", isAuth, addUserRole);
router.get("/me", isAuth, myProfile);

export default router;
