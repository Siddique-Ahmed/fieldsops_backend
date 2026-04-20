import express from "express";
import {
  getAllUsers,
  getTechnicians,
  getClients,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser,
  deactivateOwnAccount,
  updateOwnProfile,
  changeUserRole,
  changePassword,
} from "../controller/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

const router = express.Router();

// Protected routes - Admin only to see their company's technicians and clients
router.get(
  "/technicians",
  authMiddleware,
  authorizeRole("admin"),
  getTechnicians,
);
router.get("/clients", authMiddleware, authorizeRole("admin"), getClients);

// Protected routes
router.get("/current", authMiddleware, getCurrentUser);
router.get("/:id", authMiddleware, getUserById);

// User profile management
router.post("/deactivate/self", authMiddleware, deactivateOwnAccount);
router.put("/profile/update", authMiddleware, updateOwnProfile);
router.post("/password/change", authMiddleware, changePassword);

// Admin only - role management
router.post(
  "/role/change",
  authMiddleware,
  authorizeRole("admin"),
  changeUserRole,
);

// Admin only routes
router.get("/", authMiddleware, authorizeRole("admin"), getAllUsers);
router.put("/:id", authMiddleware, authorizeRole("admin"), updateUser);
router.delete("/:id", authMiddleware, authorizeRole("admin"), deleteUser);

export default router;
