import express from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  getClientJobs,
  getTechnicianJobs,
  assignTechnician,
  updateJobStatus,
  addNote,
  updateJob,
  deleteJob,
} from "../controller/job.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

const router = express.Router();

// Protected routes - SPECIFIC routes MUST come before generic ones
router.get("/client/:clientId", authMiddleware, getClientJobs);
router.get("/technician/:technicianId", authMiddleware, getTechnicianJobs);

// Generic routes
router.get("/", authMiddleware, getAllJobs);
router.get("/:id", authMiddleware, getJobById);

// Admin only
router.post("/", authMiddleware, authorizeRole("admin"), createJob);
router.post(
  "/assign",
  authMiddleware,
  authorizeRole("admin"),
  assignTechnician,
);
router.put("/:jobId", authMiddleware, authorizeRole("admin"), updateJob);
router.delete("/:jobId", authMiddleware, authorizeRole("admin"), deleteJob);

// Technician & Admin
router.patch(
  "/:jobId/status",
  authMiddleware,
  authorizeRole("technician", "admin"),
  updateJobStatus,
);

// All authenticated users
router.post("/:jobId/notes", authMiddleware, addNote);

export default router;
