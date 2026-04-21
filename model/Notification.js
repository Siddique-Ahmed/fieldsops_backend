import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // ✅ Who receives the notification
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ Type of notification
    type: {
      type: String,
      enum: [
        "job_assigned",
        "job_reassigned",
        "status_changed",
        "note_added",
        "job_completed",
      ],
      required: true,
    },

    // ✅ Reference to related job
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },

    // ✅ Who triggered the notification
    relatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ✅ Notification content
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // ✅ Additional data for template rendering
    metadata: mongoose.Schema.Types.Mixed,

    // ✅ Read status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // ✅ Delivery information
    deliveryMethod: {
      type: String,
      enum: ["email", "in-app", "sms"],
      default: "in-app",
    },

    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    failureReason: String,

    // ✅ Retry information
    retryCount: {
      type: Number,
      default: 0,
    },

    maxRetries: {
      type: Number,
      default: 3,
    },

    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ Indexes for querying
notificationSchema.index({ recipientId: 1, read: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ jobId: 1 });
notificationSchema.index({ deliveryStatus: 1, nextRetryAt: 1 });

export default mongoose.model("Notification", notificationSchema);
