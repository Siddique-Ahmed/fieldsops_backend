import * as jobService from "../service/jobService.js";
import Client from "../model/Client.js";
import Technician from "../model/Technician.js";

// ✅ Create Job
export const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      clientId,
      technicianId,
      priority,
      scheduledAt,
      dueAt,
    } = req.body;

    // Validation
    if (!title || !description || !clientId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "title, description, clientId, and scheduledAt are required",
      });
    }

    const job = await jobService.createJob(
      {
        title,
        description,
        priority: priority || "medium",
        clientId,
        technicianId: technicianId || null,
        scheduledAt: new Date(scheduledAt),
        dueAt: dueAt ? new Date(dueAt) : null,
      },
      req.user.id
    );

    // Add job to client's jobs array
    await Client.findByIdAndUpdate(clientId, { $push: { jobs: { jobId: job._id } } });

    // Add job to technician's assignedJobs array (if assigned)
    if (technicianId) {
      await Technician.findByIdAndUpdate(technicianId, {
        $push: { assignedJobs: { jobId: job._id } },
      });
    }

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Get All Jobs with Filters
export const getAllJobs = async (req, res) => {
  try {
    const { status, priority, clientId, technicianId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (clientId) filter.clientId = clientId;
    if (technicianId) filter.technicianId = technicianId;

    const skip = (page - 1) * limit;

    const { jobs, total } = await jobService.getAllJobs(
      filter,
      skip,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Get Job Details by ID
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await jobService.getJobById(id);

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Get Client Jobs
export const getClientJobs = async (req, res) => {
  try {
    const { clientId } = req.params;

    const { jobs, total } = await jobService.getAllJobs(
      { clientId },
      0,
      100
    );

    res.status(200).json({
      success: true,
      total,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Get Technician Jobs
export const getTechnicianJobs = async (req, res) => {
  try {
    const { technicianId } = req.params;

    const { jobs, total } = await jobService.getAllJobs(
      { technicianId },
      0,
      100
    );

    res.status(200).json({
      success: true,
      total,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Assign Technician (Initial)
export const assignTechnician = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { technicianId } = req.body;

    if (!technicianId) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "technicianId is required",
      });
    }

    const job = await jobService.assignTechnician(
      jobId,
      technicianId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Technician assigned successfully",
      data: job,
    });
  } catch (error) {
    if (error.message.includes("already assigned")) {
      return res.status(409).json({
        success: false,
        error: "CONFLICT",
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ CRITICAL: Reassign Technician
export const reassignTechnician = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { newTechnicianId, reason, reassignmentType = "graceful" } = req.body;

    if (!newTechnicianId) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "newTechnicianId is required",
      });
    }

    const result = await jobService.reassignTechnician(
      jobId,
      newTechnicianId,
      reason || "Not specified",
      reassignmentType,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Technician reassigned successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Update Job Status
export const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "status is required",
      });
    }

    const job = await jobService.updateJobStatus(
      jobId,
      status,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: job,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: error.message,
    });
  }
};

// ✅ Get Job History (Audit Trail)
export const getJobHistory = async (req, res) => {
  try {
    const { jobId } = req.params;

    const history = await jobService.getJobHistory(jobId);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Get Assignment History
export const getAssignmentHistory = async (req, res) => {
  try {
    const { jobId } = req.params;

    const history = await jobService.getAssignmentHistory(jobId);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Add Note to Job
export const addNote = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { text, attachments } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Note text is required",
      });
    }

    const job = await jobService.addNoteToJob(
      jobId,
      { text, attachments },
      req.user.id,
      req.user.role
    );

    res.status(201).json({
      success: true,
      message: "Note added successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Update Job Details
export const updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { title, description, priority, scheduledAt, dueAt } = req.body;

    const job = await jobService.getJobById(jobId);

    if (title) job.title = title;
    if (description) job.description = description;
    if (priority) job.priority = priority;
    if (scheduledAt) job.scheduledAt = new Date(scheduledAt);
    if (dueAt) job.dueAt = new Date(dueAt);

    await job.save();

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

// ✅ Delete Job
export const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await jobService.getJobById(jobId);

    // Remove job from client's jobs array
    await Client.findByIdAndUpdate(job.clientId, {
      $pull: { jobs: { jobId } },
    });

    // Remove job from technician's jobs array if assigned
    if (job.technicianId) {
      await Technician.findByIdAndUpdate(job.technicianId, {
        $pull: { assignedJobs: { jobId } },
      });
    }

    // Delete the job
    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};
