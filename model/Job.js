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
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide a client ID"],
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    scheduledAt: {
      type: Date,
      required: [true, "Please provide a scheduled date"],
    },
    notes: [
      {
        userId: {
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

// Populate references
jobSchema.pre("find", function () {
  this.populate("clientId", "name email").populate("technicianId", "name email");
});

jobSchema.pre("findOne", function () {
  this.populate("clientId", "name email").populate("technicianId", "name email");
});

jobSchema.pre("findOneAndUpdate", function () {
  this.populate("clientId", "name email").populate("technicianId", "name email");
});

export default mongoose.model("Job", jobSchema);
