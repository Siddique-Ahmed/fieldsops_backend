import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a job title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    status: {
      type: String,
      enum: ["pending", "assigned", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // ✅ FIX: Changed ref from "User" to "Client" to match controller logic
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Please provide a client ID"],
    },
    // ✅ FIX: Changed ref from "User" to "Technician" to match controller logic
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      default: null,
    },
    scheduledAt: {
      type: Date,
      required: [true, "Please provide a scheduled date"],
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: [
      {
        // ✅ FIX: Renamed "userId" → "addedBy" to match controller and frontend
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: String,
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ✅ FIX: Removed buggy pre-hooks that cause double-populate conflicts.
// Controllers handle population explicitly with .populate() chaining.

export default mongoose.model("Job", jobSchema);
