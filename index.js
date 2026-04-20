import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables FIRST before importing other modules
dotenv.config();

import connectDB from "./config/db.config.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import jobRoutes from "./routes/job.routes.js";
import { verifyEmailConnection } from "./utils/email.service.js";

const app = express();
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173/",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "FieldOps API Server",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      jobs: "/api/jobs",
    },
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    // Verify email service connection
    const emailConnected = await verifyEmailConnection();
    if (!emailConnected) {
      console.warn(
        "⚠️  Email service is not properly configured. Email invitations will fail.",
      );
      console.warn("Please check EMAIL_USER and EMAIL_PASSWORD in .env file");
    }

    app.listen(PORT, () => {
      console.log(
        `Server is running on port ${PORT} ${process.env.FRONTEND_URL}`,
      );
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });
