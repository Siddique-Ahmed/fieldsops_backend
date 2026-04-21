import express from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  getClientJobs,
  getTechnicianJobs,
  assignTechnician,
  reassignTechnician,
  updateJobStatus,
  getJobHistory,
  getAssignmentHistory,
  addNote,
  updateJob,
  deleteJob,
} from "../controller/job.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorizeRole } from "../middleware/role.middleware.js";

const router = express.Router();

// ✅ GET Routes (SPECIFIC before GENERIC)
router.get("/client/:clientId", authMiddleware, getClientJobs);
router.get("/technician/:technicianId", authMiddleware, getTechnicianJobs);

// ✅ Audit Trail endpoints — MUST be before /:id or Express swallows them
router.get("/:jobId/history", authMiddleware, authorizeRole("admin"), getJobHistory);
router.get("/:jobId/assignment-history", authMiddleware, authorizeRole("admin"), getAssignmentHistory);

// ✅ Generic GET routes — keep LAST so they don't shadow subroutes
router.get("/", authMiddleware, getAllJobs);
router.get("/:id", authMiddleware, getJobById);

// ✅ Admin only - Create, Update, Delete
router.post("/", authMiddleware, authorizeRole("admin"), createJob);
router.put("/:jobId", authMiddleware, authorizeRole("admin"), updateJob);
router.delete("/:jobId", authMiddleware, authorizeRole("admin"), deleteJob);

// ✅ Admin only - Assignment endpoints
router.patch("/:jobId/assign", authMiddleware, authorizeRole("admin"), assignTechnician);
router.patch("/:jobId/reassign", authMiddleware, authorizeRole("admin"), reassignTechnician);

// ✅ Technician & Admin - Status updates
router.patch("/:jobId/status", authMiddleware, authorizeRole("technician", "admin"), updateJobStatus);

// ✅ All authenticated users - Notes
router.post("/:jobId/notes", authMiddleware, addNote);

export default router;
