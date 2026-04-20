import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    department: {
      type: String,
      default: "Management",
    },
    permissions: {
      type: [String],
      default: [
        "create_jobs",
        "assign_technicians",
        "manage_users",
        "view_reports",
      ],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Admin", adminSchema);
