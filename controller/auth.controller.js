import User from "../model/User.js";
import Admin from "../model/Admin.js";
import Client from "../model/Client.js";
import Technician from "../model/Technician.js";
import Company from "../model/Company.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";
import {
  sendTechnicianInviteEmail,
  sendClientInviteEmail,
} from "../utils/email.service.js";
import crypto from "crypto";

// Admin Signup with Company Creation
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
        error: "Name, email, and password are all required fields",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
        error: `An account with email "${email}" already exists. Please use a different email or try logging in.`,
      });
    }

    // Create user (admin) - without company initially
    const user = await User.create({
      name,
      email,
      password,
      role: "admin",
      status: "active",
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully. Please create your company.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error("❌ Admin Registration Error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message || "An error occurred during registration",
    });
  }
};

// Create Company (Step 2 of signup)
export const createCompany = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const adminId = req.user.id;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Company name and phone are required",
      });
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: "Company name already exists",
        error: `A company named "${name}" is already registered in the system`,
      });
    }

    // Get the admin user
    const user = await User.findById(adminId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: `Admin user with ID ${adminId} not found in database`,
      });
    }

    // Create company
    const company = await Company.create({
      name,
      phone,
      email: user.email,
      adminId: user._id,
      address: address || {},
      employees: [user._id],
    });

    // Create admin profile
    const admin = await Admin.create({
      userId: user._id,
      company: company._id,
    });

    // Update user with company and admin references
    user.company = company._id;
    user.profileRef.admin = admin._id;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Company created successfully",
      data: {
        company: {
          id: company._id,
          name: company.name,
          phone: company.phone,
          email: company.email,
        },
      },
    });
  } catch (error) {
    console.error("❌ Company Creation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create company",
      error: error.message || "An error occurred while creating the company",
      details: error.keyPattern ? `Duplicate field: ${Object.keys(error.keyPattern).join(", ")}` : null,
    });
  }
};

// Invite Technician
export const inviteTechnician = async (req, res) => {
  try {
    const { email, name } = req.body;
    const adminId = req.user.id;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and name are required",
      });
    }

    // Get admin's company
    const admin = await Admin.findOne({ userId: adminId });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
        error: `Admin profile not found for user ID: ${adminId}`,
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
        error: `The email "${email}" is already registered in the system. Please use a different email.`,
      });
    }

    // Generate random password and token
    const randomPassword = crypto.randomBytes(8).toString("hex");
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user with pending status
    const user = await User.create({
      name,
      email,
      password: randomPassword,
      role: "technician",
      company: admin.company,
      status: "pending",
    });

    // Create technician profile
    const technician = await Technician.create({
      userId: user._id,
      company: admin.company,
    });

    user.profileRef.technician = technician._id;
    await user.save();

    // Add to company employees
    await Company.findByIdAndUpdate(admin.company, {
      $push: { employees: user._id },
    });

    // Add invitation link to company
    await Company.findByIdAndUpdate(admin.company, {
      $push: {
        invitationLinks: {
          token: invitationToken,
          role: "technician",
          email,
          expiresAt,
        },
      },
    });

    // Get admin user for email
    const adminUser = await User.findById(adminId);
    const company = await Company.findById(admin.company);

    // Send invitation email
    let emailSent = false;
    try {
      // ✅ FIX: URL must match the frontend route /auth/update-profile (not /auth/verify-invitation)
      const inviteLink = `${process.env.FRONTEND_URL}/auth/update-profile?token=${invitationToken}`;
      await sendTechnicianInviteEmail(
        name,
        email,
        randomPassword,
        adminUser.name,
        company.name,
        inviteLink,
      );
      emailSent = true;
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: emailSent 
        ? "Invitation sent successfully" 
        : "Technician created but invitation email could not be sent. User can login with temporary password.",
      data: {
        inviteLink: `${process.env.FRONTEND_URL}/auth/update-profile?token=${invitationToken}`,
        tempPassword: randomPassword,
        email,
        emailSent,
      },
    });
  } catch (error) {
    console.error("❌ Technician Invitation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send invitation",
      error: error.message || "An error occurred while sending technician invitation",
    });
  }
};

// Invite Client
export const inviteClient = async (req, res) => {
  try {
    const { email, name } = req.body;
    const adminId = req.user.id;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email and name are required",
      });
    }

    // Get admin's company
    const admin = await Admin.findOne({ userId: adminId });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
        error: `Admin profile not found for user ID: ${adminId}`,
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
        error: `The email "${email}" is already registered in the system. Please use a different email.`,
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Add invitation link to company
    await Company.findByIdAndUpdate(admin.company, {
      $push: {
        invitationLinks: {
          token: invitationToken,
          role: "client",
          email,
          expiresAt,
        },
      },
    });

    // Get admin user and company for email
    const adminUser = await User.findById(adminId);
    const company = await Company.findById(admin.company);

    // Send invitation email
    let emailSent = false;
    try {
      const signupLink = `${process.env.FRONTEND_URL}/auth/signup-client?token=${invitationToken}&email=${email}`;
      await sendClientInviteEmail(
        name,
        email,
        adminUser.name,
        company.name,
        signupLink,
      );
      emailSent = true;
    } catch (emailError) {
      console.error("❌ Email sending failed:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: emailSent 
        ? "Client invitation sent successfully" 
        : "Client invitation created but email could not be sent",
      data: {
        signupLink: `${process.env.FRONTEND_URL}/auth/signup-client?token=${invitationToken}&email=${email}`,
        emailSent,
      },
    });
  } catch (error) {
    console.error("❌ Client Invitation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send client invitation",
      error: error.message || "An error occurred while sending client invitation",
    });
  }
};

// Unified Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password",
      });
    }

    // Find user and select password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found with this email",
        error: `No account found for email: ${email}`,
      });
    }

    // Check password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
        error: `Invalid password for user: ${email}`,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const responseData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      company: user.company,
    };

    // For pending technicians, fetch their invitation token
    if (
      user.status === "pending" &&
      user.role === "technician" &&
      user.company
    ) {
      const company = await Company.findById(user.company);
      if (company) {
        const invitationLink = company.invitationLinks.find(
          (link) =>
            link.email === user.email &&
            link.role === "technician" &&
            !link.used,
        );
        if (invitationLink) {
          responseData.invitationToken = invitationLink.token;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: responseData,
        accessToken,
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message || "An unexpected error occurred during login",
    });
  }
};

// Verify Invitation & Update Profile
export const verifyInvitation = async (req, res) => {
  try {
    const { token, skillSet, password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: `User with ID ${userId} not found in database`,
      });
    }

    const company = await Company.findById(user.company);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
        error: `Company for user ${userId} not found`,
      });
    }

    const invitationLink = company.invitationLinks.find(
      (link) => link.token === token,
    );

    if (!invitationLink) {
      return res.status(401).json({
        success: false,
        message: "Invitation token not found",
        error: "The provided invitation token does not exist or is invalid",
      });
    }

    if (invitationLink.used) {
      return res.status(400).json({
        success: false,
        message: "Invitation already used",
        error: "This invitation has already been used",
      });
    }

    if (new Date() > invitationLink.expiresAt) {
      return res.status(401).json({
        success: false,
        message: "Invitation has expired",
        error: `Invitation expired on ${invitationLink.expiresAt.toDateString()}. Please request a new invitation.`,
      });
    }

    // Update technician profile
    if (user.role === "technician" && skillSet) {
      await Technician.findOneAndUpdate({ userId: user._id }, { skillSet });
    }

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }
      user.password = password;
    }

    // Mark invitation as used
    await Company.updateOne(
      { _id: user.company, "invitationLinks.token": token },
      { "invitationLinks.$.used": true },
    );

    // Update user status to active
    user.status = "active";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("❌ Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify invitation",
      error: error.message || "An error occurred during invitation verification",
    });
  }
};

// Client Signup with Invitation Token
export const signupClient = async (req, res) => {
  try {
    const { email, password, name, companyName, phone, address, token } =
      req.body;

    if (!email || !password || !name || !token) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        error: "Please provide email, password, name, and invitation token",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find company with valid invitation
    const company = await Company.findOne({
      "invitationLinks.token": token,
      "invitationLinks.email": email,
      "invitationLinks.role": "client",
    });

    if (!company) {
      return res.status(401).json({
        success: false,
        message: "Invalid invitation token",
        error: `No valid invitation found for email: ${email}. The token may be invalid or expired.`,
      });
    }

    const invitationLink = company.invitationLinks.find(
      (link) => link.token === token && link.email === email,
    );

    if (invitationLink.used) {
      return res.status(400).json({
        success: false,
        message: "Invitation already used",
        error: "This invitation has already been used to create an account",
      });
    }

    if (new Date() > invitationLink.expiresAt) {
      return res.status(401).json({
        success: false,
        message: "Invitation expired",
        error: `This invitation expired on ${invitationLink.expiresAt.toDateString()}. Please request a new invitation.`,
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
        error: `The email "${email}" is already registered in the system`,
      });
    }

    // Create user (client)
    const user = await User.create({
      name,
      email,
      password,
      role: "client",
      company: company._id,
      status: "active",
    });

    // Create client profile
    const client = await Client.create({
      userId: user._id,
      company: company._id,
      companyName: companyName || name,
      phone: phone || "",
      address: address || {},
    });

    user.profileRef.client = client._id;
    await user.save();

    // Add to company employees
    await Company.findByIdAndUpdate(company._id, {
      $push: { employees: user._id },
    });

    // Mark invitation as used
    await Company.updateOne(
      { _id: company._id, "invitationLinks.token": token },
      { "invitationLinks.$.used": true },
    );

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: "Client registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: company._id,
        },
        accessToken,
      },
    });
  } catch (error) {
    console.error("❌ Client Signup Error:", error);
    res.status(500).json({
      success: false,
      message: "Client registration failed",
      error: error.message || "An error occurred while registering client",
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
        error: "No refresh token found in cookies. Please login again.",
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        error: "The refresh token is invalid or has expired. Please login again.",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: `User with ID ${decoded.id} no longer exists. Please login again.`,
      });
    }

    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error("❌ Token Refresh Error:", error);
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
      error: error.message || "An error occurred while refreshing token",
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message || "An error occurred during logout",
    });
  }
};

// Get company info from invitation token (for client signup form)
export const getCompanyFromToken = async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Token and email are required",
      });
    }

    // Find company with valid invitation
    const company = await Company.findOne({
      "invitationLinks.token": token,
      "invitationLinks.email": email,
      "invitationLinks.role": "client",
    });

    if (!company) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation token",
      });
    }

    const invitationLink = company.invitationLinks.find(
      (link) => link.token === token && link.email === email,
    );

    if (invitationLink.used) {
      return res.status(400).json({
        success: false,
        message: "Invitation has already been used",
      });
    }

    if (new Date() > invitationLink.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        companyName: company.name,
        companyPhone: company.phone,
        companyEmail: company.email,
        email: email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get company info",
      error: error.message,
    });
  }
};
