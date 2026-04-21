import mongoose from "mongoose";

const jobHistorySchema = new mongoose.Schema(
  {
    // ✅ Reference to the job
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    // ✅ Action type
    action: {
      type: String,
      enum: [
        "created",
        "assigned",
        "reassigned",
        "status_changed",
        "note_added",
        "completed",
        "cancelled",
      ],
      required: true,
    },

    // ✅ Who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ Role of person who performed action
    performedRole: {
      type: String,
      enum: ["admin", "technician", "client"],
    },

    // ✅ What changed
    changes: {
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    },

    // ✅ Human-readable description
    details: {
      type: String,
      required: true,
    },

    // ✅ Additional metadata
    metadata: {
      reason: String,
      reassignmentType: String,
      notifiedUsers: [String],
    },

    // ✅ Timestamp (main query field)
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

// ✅ Indexes for querying
jobHistorySchema.index({ jobId: 1, timestamp: -1 });
jobHistorySchema.index({ performedBy: 1, timestamp: -1 });
jobHistorySchema.index({ action: 1 });

// ✅ Make collection immutable (no updates)
jobHistorySchema.pre("findByIdAndUpdate", function (next) {
  throw new Error("JobHistory is immutable. Cannot update existing records.");
});

export default mongoose.model("JobHistory", jobHistorySchema);
