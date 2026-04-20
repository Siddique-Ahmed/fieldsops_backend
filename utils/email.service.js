import nodemailer from "nodemailer";

let transporter = null;

// Lazy initialize transporter only when needed
const getTransporter = () => {
  if (!transporter) {
    console.log("Initializing email transporter...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD?.length);

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
};

// Email templates
const emailTemplates = {
  technicianInvite: (
    technicianName,
    email,
    tempPassword,
    adminName,
    companyName,
    inviteLink,
  ) => ({
    subject: `${companyName} - Technician Invitation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0;">Welcome to ${companyName}!</h2>
        </div>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Hi <strong>${technicianName}</strong>,
        </p>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          You've been invited to join <strong>${companyName}</strong> as a Technician by <strong>${adminName}</strong>.
        </p>

        <div style="background-color: #f0f7ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 10px 0; color: #333;"><strong>Your Account Details:</strong></p>
          <p style="margin: 8px 0; color: #666;">Email: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${email}</code></p>
          <p style="margin: 8px 0; color: #666;">Temporary Password: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></p>
          <p style="margin: 10px 0; color: #d9534f; font-weight: bold;">⚠️ Please change your password after first login</p>
        </div>

        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 20px;">
          Click the button below to complete your profile and get started:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Complete Your Profile
          </a>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          If the button doesn't work, copy and paste this link in your browser:<br>
          <code style="background: #f5f5f5; padding: 10px; display: block; margin-top: 10px; word-break: break-all; border-radius: 4px;">${inviteLink}</code>
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `,
  }),

  clientInvite: (clientName, email, adminName, companyName, signupLink) => ({
    subject: `${companyName} - Join Now as a Client`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0;">Join ${companyName}!</h2>
        </div>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Hi <strong>${clientName}</strong>,
        </p>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          <strong>${adminName}</strong> from <strong>${companyName}</strong> has invited you to join their field service management system.
        </p>

        <div style="background-color: #f0f7ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 10px 0; color: #333;"><strong>Invitation Details:</strong></p>
          <p style="margin: 8px 0; color: #666;">Company: <strong>${companyName}</strong></p>
          <p style="margin: 8px 0; color: #666;">Your Email: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${email}</code></p>
          <p style="margin: 10px 0; color: #27ae60; font-weight: bold;">✓ Invitation valid for 7 days</p>
        </div>

        <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 20px;">
          Click the button below to create your account:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${signupLink}" style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Create Account
          </a>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          If the button doesn't work, copy and paste this link in your browser:<br>
          <code style="background: #f5f5f5; padding: 10px; display: block; margin-top: 10px; word-break: break-all; border-radius: 4px;">${signupLink}</code>
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    `,
  }),
};

// Send technician invitation email
export const sendTechnicianInviteEmail = async (
  technicianName,
  email,
  tempPassword,
  adminName,
  companyName,
  inviteLink,
) => {
  try {
    const transporter = getTransporter();
    const mailOptions = emailTemplates.technicianInvite(
      technicianName,
      email,
      tempPassword,
      adminName,
      companyName,
      inviteLink,
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      ...mailOptions,
    });

    console.log(`✓ Technician invitation email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending technician invite email:", error.message);
    console.error("Email config - User:", process.env.EMAIL_USER);
    throw error;
  }
};

// Send client invitation email
export const sendClientInviteEmail = async (
  clientName,
  email,
  adminName,
  companyName,
  signupLink,
) => {
  try {
    const transporter = getTransporter();
    const mailOptions = emailTemplates.clientInvite(
      clientName,
      email,
      adminName,
      companyName,
      signupLink,
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      ...mailOptions,
    });

    console.log(`✓ Client invitation email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending client invite email:", error.message);
    console.error("Email config - User:", process.env.EMAIL_USER);
    throw error;
  }
};

// Verify connection
export const verifyEmailConnection = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log("✓ Email service connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Email service connection failed:", error.message);
    return false;
  }
};
