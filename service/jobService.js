import Job from "../model/Job.js";
import JobHistory from "../model/JobHistory.js";
import Notification from "../model/Notification.js";

// ✅ Create Job (with optional technician)
export const createJob = async (jobData, userId) => {
  try {
    const job = new Job({
      ...jobData,
      createdBy: userId,
      technicianId: jobData.technicianId || null,
      status: jobData.technicianId ? "assigned" : "pending",
    });

    await job.save();

    // ✅ Create history entry
    await JobHistory.create({
      jobId: job._id,
      action: "created",
      performedBy: userId,
      performedRole: "admin",
      details: `Job created: ${job.title}`,
      changes: {
        field: "status",
        oldValue: null,
        newValue: job.status,
      },
    });

    // ✅ If technician assigned, create notification
    if (jobData.technicianId) {
      await Notification.create({
        recipientId: jobData.technicianId,
        type: "job_assigned",
        jobId: job._id,
        relatedUserId: userId,
        title: "New Job Assigned",
        message: `You have been assigned to: ${job.title}`,
        metadata: {
          priority: job.priority,
          scheduledAt: job.scheduledAt,
        },
        deliveryMethod: "in-app",
      });
    }

    return job;
  } catch (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }
};

// ✅ Get all jobs with filters
export const getAllJobs = async (filter = {}, skip = 0, limit = 20) => {
  try {
    const jobs = await Job.find(filter)
      .populate("clientId", "companyName phone")
      // ✅ FIX Bug 1: nested populate so technicianId.userId.name is available on cards
      .populate({
        path: "technicianId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate("createdBy", "name email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Job.countDocuments(filter);

    return { jobs, total };
  } catch (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }
};

// ✅ Get job details by ID
export const getJobById = async (jobId) => {
  try {
    const job = await Job.findById(jobId)
      .populate("clientId")
      .populate({
        path: "technicianId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate("createdBy", "name email")
      .populate("notes.addedBy", "name email")
      .populate({
        path: "assignmentHistory.technicianId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate("assignmentHistory.assignedBy", "name");

    if (!job) throw new Error("Job not found");
    return job;
  } catch (error) {
    throw new Error(`Failed to get job: ${error.message}`);
  }
};

// ✅ Assign Technician (First Time) — auto-routes to reassign if already assigned
export const assignTechnician = async (jobId, technicianId, userId) => {
  try {
    const job = await Job.findById(jobId);
    if (!job) throw new Error("Job not found");

    // ✅ FIX: If already assigned, auto-route to reassign instead of throwing
    if (job.technicianId) {
      // Same technician? No-op — return job as-is
      if (job.technicianId.toString() === technicianId.toString()) {
        return job;
      }
      // Different technician → treat as reassignment
      return await reassignTechnician(
        jobId,
        technicianId,
        "Re-assigned via assign action",
        "graceful",
        userId
      );
    }

    // ✅ First-time assignment: use findByIdAndUpdate to avoid createdBy validation
    const now = new Date();

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: { technicianId, status: "assigned" },
        $push: {
          assignmentHistory: {
            technicianId,
            assignedAt: now,
            assignedBy: userId,
            status: "active",
          },
        },
      },
      { new: true, runValidators: false }
    );

    // ✅ Create history entry
    await JobHistory.create({
      jobId,
      action: "assigned",
      performedBy: userId,
      performedRole: "admin",
      details: `Technician assigned for the first time`,
      changes: {
        field: "technicianId",
        oldValue: null,
        newValue: technicianId,
      },
    });

    // ✅ Send notification to technician
    await Notification.create({
      recipientId: technicianId,
      type: "job_assigned",
      jobId,
      relatedUserId: userId,
      title: "New Job Assigned",
      message: `You have been assigned to: ${updatedJob.title}`,
      metadata: {
        priority: updatedJob.priority,
        scheduledAt: updatedJob.scheduledAt,
      },
      deliveryMethod: "in-app",
    });

    return updatedJob;
  } catch (error) {
    throw new Error(`Failed to assign technician: ${error.message}`);
  }
};


// ✅ CRITICAL: Reassign Technician
export const reassignTechnician = async (
  jobId,
  newTechnicianId,
  reason,
  reassignmentType,
  userId
) => {
  try {
    // ✅ FIX: Use findById WITHOUT .save() to avoid 'createdBy required' validation
    const job = await Job.findById(jobId);
    if (!job) throw new Error("Job not found");

    const oldTechnicianId = job.technicianId;
    if (!oldTechnicianId) {
      throw new Error(
        "Job has no technician assigned yet. Use assign instead."
      );
    }

    // ✅ Build the $set and $push update — bypass full doc validation
    const now = new Date();

    // Mark old active assignment as replaced inside the array
    await Job.updateOne(
      {
        _id: jobId,
        "assignmentHistory.technicianId": oldTechnicianId,
        "assignmentHistory.status": "active",
      },
      {
        $set: {
          "assignmentHistory.$.unassignedAt": now,
          "assignmentHistory.$.reason": reason,
          "assignmentHistory.$.status": "replaced",
        },
      }
    );

    // ✅ Push new assignment + update technicianId — no full validation triggered
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: { technicianId: newTechnicianId },
        $push: {
          assignmentHistory: {
            technicianId: newTechnicianId,
            assignedAt: now,
            assignedBy: userId,
            reason: `Reassigned. Previous reason: ${reason}`,
            status: "active",
          },
        },
      },
      { new: true, runValidators: false } // ✅ skip required-field validation
    );

    // ✅ Create history entry
    await JobHistory.create({
      jobId,
      action: "reassigned",
      performedBy: userId,
      performedRole: "admin",
      details: `Technician reassigned. Reason: ${reason}`,
      changes: {
        field: "technicianId",
        oldValue: oldTechnicianId,
        newValue: newTechnicianId,
      },
      metadata: {
        reason,
        reassignmentType,
        notifiedUsers: [oldTechnicianId.toString(), newTechnicianId.toString()],
      },
    });

    // ✅ Notify old technician
    await Notification.create({
      recipientId: oldTechnicianId,
      type: "job_reassigned",
      jobId,
      relatedUserId: userId,
      title: "Job Reassigned",
      message: `Job "${updatedJob.title}" has been reassigned away from you`,
      metadata: { reason },
      deliveryMethod: "in-app",
    });

    // ✅ Notify new technician
    await Notification.create({
      recipientId: newTechnicianId,
      type: "job_assigned",
      jobId,
      relatedUserId: userId,
      title: "New Job Assigned to You",
      message: `You have been assigned to: ${updatedJob.title}`,
      metadata: { priority: updatedJob.priority },
      deliveryMethod: "in-app",
    });

    return {
      jobId,
      oldTechnician: oldTechnicianId,
      newTechnician: newTechnicianId,
      reassignedAt: now,
    };
  } catch (error) {
    throw new Error(`Failed to reassign technician: ${error.message}`);
  }
};

// ✅ Update Job Status with Validation
export const updateJobStatus = async (jobId, newStatus, userId, userRole) => {
  try {
    const job = await Job.findById(jobId);
    if (!job) throw new Error("Job not found");

    const oldStatus = job.status;

    // Same status — no-op
    if (oldStatus === newStatus) {
      throw new Error(`Job is already in "${newStatus}" status`);
    }

    // ✅ Role-based restrictions for technicians only
    if (userRole === "technician") {
      const technicianTransitions = {
        assigned: ["in-progress"],
        "in-progress": ["completed"],
      };
      if (!technicianTransitions[oldStatus]?.includes(newStatus)) {
        throw new Error(
          `Technicians can only move jobs from assigned→in-progress or in-progress→completed`
        );
      }
    }

    // ✅ FIX Bug 2: Admins can set any valid status freely (no strict transition chain)
    // Only block moving away from terminal states
    if (userRole === "admin") {
      if (oldStatus === "completed" || oldStatus === "cancelled") {
        throw new Error(
          `Cannot change status of a ${oldStatus} job`
        );
      }
    }

    // ✅ FIX Bug 2: Use findByIdAndUpdate to bypass createdBy required-field validator
    const updateFields = { status: newStatus };
    if (newStatus === "in-progress") updateFields.startedAt = new Date();
    if (newStatus === "completed") updateFields.completedAt = new Date();

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    // ✅ Create history entry
    await JobHistory.create({
      jobId: updatedJob._id,
      action: "status_changed",
      performedBy: userId,
      performedRole: userRole,
      details: `Status changed from ${oldStatus} to ${newStatus}`,
      changes: {
        field: "status",
        oldValue: oldStatus,
        newValue: newStatus,
      },
    });

    // ✅ Create notification for status change
    if (userRole === "technician" && newStatus === "completed") {
      await Notification.create({
        recipientId: updatedJob.createdBy,
        type: "job_completed",
        jobId: updatedJob._id,
        relatedUserId: userId,
        title: "Job Completed",
        message: `Job "${updatedJob.title}" has been completed`,
        deliveryMethod: "in-app",
      });
    }

    return updatedJob;
  } catch (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }
};

// ✅ Get Job History (Audit Trail)
export const getJobHistory = async (jobId) => {
  try {
    const history = await JobHistory.find({ jobId })
      .sort({ timestamp: -1 })
      .populate("performedBy", "name email role")
      .lean();

    // ✅ FIX: Return empty array instead of throwing — empty history is valid
    return history;
  } catch (error) {
    throw new Error(`Failed to get job history: ${error.message}`);
  }
};

// ✅ Get Assignment History
export const getAssignmentHistory = async (jobId) => {
  try {
    const job = await Job.findById(jobId)
      .populate({
        path: "assignmentHistory.technicianId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate("assignmentHistory.assignedBy", "name")
      .lean();

    if (!job) throw new Error("Job not found");

    return job.assignmentHistory || [];
  } catch (error) {
    throw new Error(`Failed to get assignment history: ${error.message}`);
  }
};

// ✅ Add note to job
export const addNoteToJob = async (jobId, noteData, userId, userRole) => {
  try {
    const job = await Job.findById(jobId);
    if (!job) throw new Error("Job not found");

    const note = {
      addedBy: userId,
      role: userRole,
      text: noteData.text,
      attachments: noteData.attachments || [],
      createdAt: new Date(),
    };

    job.notes.push(note);
    await job.save();

    // ✅ Create history entry
    await JobHistory.create({
      jobId: job._id,
      action: "note_added",
      performedBy: userId,
      performedRole: userRole,
      details: `Note added by ${userRole}`,
      metadata: {
        noteText: noteData.text.substring(0, 100),
      },
    });

    return job;
  } catch (error) {
    throw new Error(`Failed to add note: ${error.message}`);
  }
};

// ✅ Dashboard statistics
export const getDashboardStats = async (companyId) => {
  try {
    const stats = {
      totalJobs: await Job.countDocuments({ company: companyId }),
      pendingJobs: await Job.countDocuments({
        status: "pending",
        company: companyId,
      }),
      assignedJobs: await Job.countDocuments({
        status: "assigned",
        company: companyId,
      }),
      inProgressJobs: await Job.countDocuments({
        status: "in-progress",
        company: companyId,
      }),
      completedJobs: await Job.countDocuments({
        status: "completed",
        company: companyId,
      }),
      cancelledJobs: await Job.countDocuments({
        status: "cancelled",
        company: companyId,
      }),
    };

    return stats;
  } catch (error) {
    throw new Error(`Failed to get dashboard stats: ${error.message}`);
  }
};
