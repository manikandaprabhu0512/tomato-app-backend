import User from "../model/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/trycatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { oauth2client } from "../config/googleConfig.js";
import axios from "axios";
import crypto from "crypto";
import { publishEvent } from "../config/otp.publisher.js";
import redis from "../config/redis.js";

const allowedRoles = ["customer", "rider", "seller"] as const;
type Role = (typeof allowedRoles)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10,15}$/;

const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key.toString("hex"));
    });
  });

  return `${salt}:${derivedKey}`;
};

const comparePassword = async (password: string, storedPassword: string) => {
  if (!storedPassword) return false;

  if (!storedPassword.includes(":")) {
    return password === storedPassword;
  }

  const [salt, originalHash] = storedPassword.split(":");

  if (!salt || !originalHash) return false;

  const derivedKey = await new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key.toString("hex"));
    });
  });

  return crypto.timingSafeEqual(
    Buffer.from(originalHash, "hex"),
    Buffer.from(derivedKey, "hex"),
  );
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

const sanitizeUser = (user: any) => {
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.password;
  return safeUser;
};

const signUserToken = (user: any) =>
  jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "15d",
  });

export const loginUser = TryCatch(async (req, res) => {
  console.log("User logging in....");

  const { code } = req.body;

  console.log("Code: ", code);

  if (!code) {
    return res.status(400).json({
      message: "Authorization code is required",
    });
  }

  const googleRes = await oauth2client.getToken(code);

  oauth2client.setCredentials(googleRes.tokens);

  const userRes = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`,
  );
  const { email, name, picture } = userRes.data;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      image: picture,
    });
  }

  const safeUser = sanitizeUser(user);
  const token = signUserToken(safeUser);

  res.status(200).json({
    message: "Logged Success",
    token,
    user: safeUser,
  });
});

export const loginWithEmailPassword = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long",
    });
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.password) {
    return res.status(404).json({
      message: "User not found with this email",
    });
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const safeUser = sanitizeUser(user);
  const token = signUserToken(safeUser);

  return res.status(200).json({
    message: "Logged in successfully",
    token,
    user: safeUser,
  });
});

export const loginWithPhoneNumber = TryCatch(async (req, res) => {
  const phoneInput = req.body.phonenumber;

  if (!phoneInput) {
    return res.status(400).json({
      message: "Phone number is required",
    });
  }

  const normalizedPhone = normalizePhone(phoneInput);

  if (!PHONE_REGEX.test(normalizedPhone)) {
    return res.status(400).json({
      message: "Please enter a valid phone number",
    });
  }

  const user = await User.findOne({ phonenumber: normalizedPhone });

  if (!user) {
    return res.status(404).json({
      message: "User not found with this phone number",
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await publishEvent("OTP_QUEUE", {
    otp: otp,
    to: normalizedPhone,
  });

  const hashedOTP = await hashPassword(otp);

  await redis.set(`otp:${normalizedPhone}`, hashedOTP, "EX", 300);

  return res.status(200).send("OTP sent successfully");
});

export const verifyOtp = TryCatch(async (req, res) => {
  const { phonenumber, otp } = req.body;

  if (!phonenumber || !otp) {
    return res.status(400).json({
      message: "Phone number and OTP are required",
    });
  }

  const normalizedPhone = normalizePhone(String(phonenumber));

  if (!PHONE_REGEX.test(normalizedPhone)) {
    return res.status(400).json({
      message: "Please enter a valid phone number",
    });
  }

  if (String(otp).length !== 6) {
    return res.status(400).json({
      message: "OTP must be 6 digits",
    });
  }

  const user = await User.findOne({ phonenumber: normalizedPhone });

  if (!user) {
    return res.status(404).json({
      message: "User not found with this phone number",
    });
  }

  const storedOtp = await redis.get(`otp:${normalizedPhone}`);

  if (!storedOtp) {
    return res.status(400).json({
      message: "OTP expired or not found",
    });
  }

  const isOtpValid = await comparePassword(String(otp), storedOtp);

  if (!isOtpValid) {
    return res.status(401).json({
      message: "Invalid OTP",
    });
  }

  await redis.del(`otp:${normalizedPhone}`);

  const safeUser = sanitizeUser(user);
  const token = signUserToken(safeUser);

  return res.status(200).json({
    message: "OTP verified successfully",
    token,
    user: safeUser,
  });
});

export const signupUser = TryCatch(async (req, res) => {
  const { name, email, password, phonenumber, image } = req.body;

  if (!name || !email || !password || !phonenumber) {
    return res.status(400).json({
      message: "Name, email, password, and phone number are required",
    });
  }

  const trimmedName = String(name).trim();
  const normalizedEmail = normalizeEmail(String(email));
  const normalizedPhone = normalizePhone(String(phonenumber));

  if (trimmedName.length < 2) {
    return res.status(400).json({
      message: "Name must be at least 2 characters long",
    });
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({
      message: "Please enter a valid email address",
    });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long",
    });
  }

  if (!PHONE_REGEX.test(normalizedPhone)) {
    return res.status(400).json({
      message: "Please enter a valid phone number",
    });
  }

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { phonenumber: normalizedPhone }],
  });

  if (existingUser?.email === normalizedEmail) {
    return res.status(409).json({
      message: "Email is already registered",
    });
  }

  if (existingUser?.phonenumber === normalizedPhone) {
    return res.status(409).json({
      message: "Phone number is already registered",
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name: trimmedName,
    email: normalizedEmail,
    password: hashedPassword,
    phonenumber: normalizedPhone,
    image: image ? String(image).trim() : null,
  });

  const safeUser = sanitizeUser(user);

  return res.status(201).json({
    message: "User created successfully",
    user: safeUser,
  });
});

export const addUserRole = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user?._id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { role } = req.body as { role: Role };

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      message: "Invalid role",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { role },
    { new: true },
  );

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const safeUser = sanitizeUser(user);
  const token = signUserToken(safeUser);

  res.json({ user, token });
});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  res.json(user);
});
