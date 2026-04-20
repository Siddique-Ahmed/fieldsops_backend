import express from "express";
import {
  register,
  createCompany,
  login,
  inviteTechnician,
  inviteClient,
  verifyInvitation,
  signupClient,
  refreshAccessToken,
  logout,
  getCompanyFromToken,
} from "../controller/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/create-company", authMiddleware, createCompany);
router.post("/login", login);
router.post("/invite-technician", authMiddleware, inviteTechnician);
router.post("/invite-client", authMiddleware, inviteClient);
router.get("/get-company-from-token", getCompanyFromToken);
router.post("/verify-invitation", authMiddleware, verifyInvitation);
router.post("/signup-client", signupClient);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

export default router;
