import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://tomatoapp.store",
      "https://www.tomatoapp.store",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Route to each service
app.use(
  "/api/v1/admin",
  createProxyMiddleware({
    target: process.env.ADMIN_SERVICE_URL,
    changeOrigin: true,
  }),
);

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  }),
);

app.use(
  "/api/v1/internal",
  createProxyMiddleware({
    target: process.env.REALTIME_SERVICE_URL,
    changeOrigin: true,
  }),
);

app.use(
  "/socket.io",
  createProxyMiddleware({
    target: process.env.REALTIME_SOCKET_SERVICE_URL,
    changeOrigin: true,
    ws: true,
    secure: false,
  }),
);

app.use(
  "/api/restaurant",
  createProxyMiddleware({
    target: process.env.RESTAURANT_SERVICE_URL,
    changeOrigin: true,
  }),
);

app.use(
  "/api/rider",
  createProxyMiddleware({
    target: process.env.RIDER_SERVICE_URL,
    changeOrigin: true,
  }),
);

app.use(
  "/api/utils",
  createProxyMiddleware({
    target: process.env.UTILS_SERVICE_URL,
    changeOrigin: true,
  }),
);

app.get("/api/v1/gateway/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "gateway" });
});

app.listen(process.env.PORT, () => {
  console.log(`Gateway Service is running on port ${process.env.PORT}`);
});
