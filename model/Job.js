import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    // ✅ Basic info
    title: {
      type: String,
      required: [true, "Please provide a job title"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },

    // ✅ Status management
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

    // ✅ CRITICAL: Relationships
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Please provide a client ID"],
    },

    // ✅ UPDATED: Technician reference (OPTIONAL)
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      default: null,
    },

    // ✅ Who created the job
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ NEW: Assignment history (for reassignment feature)
    assignmentHistory: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },
        technicianId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Technician",
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        unassignedAt: {
          type: Date,
          default: null,
        },
        reason: String,
        status: {
          type: String,
          enum: ["active", "replaced"],
          default: "active",
        },
      },
    ],

    // ✅ Scheduling
    scheduledAt: {
      type: Date,
      required: [true, "Please provide a scheduled date"],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    dueAt: {
      type: Date,
      default: null,
    },

    // ✅ Notes & feedback (improved structure)
    notes: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "technician", "client"],
        },
        text: String,
        attachments: [String],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ✅ NEW: Change tracking (for audit)
    changes: [
      {
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// ✅ Indexes for performance
jobSchema.index({ clientId: 1, status: 1 });
jobSchema.index({ technicianId: 1, status: 1 });
jobSchema.index({ createdBy: 1, createdAt: -1 });
jobSchema.index({ scheduledAt: 1 });

export default mongoose.model("Job", jobSchema);
