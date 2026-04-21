import Job from "../model/Job.js";
import Client from "../model/Client.js";
import Technician from "../model/Technician.js";

export const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      clientId,
      technicianId,
      priority,
      scheduledAt,
    } = req.body;

    if (!title || !description || !clientId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check if technician exists (if provided)
    if (technicianId) {
      const technician = await Technician.findById(technicianId);
      if (!technician) {
        return res.status(404).json({
          success: false,
          message: "Technician not found",
        });
      }
    }

    const job = await Job.create({
      title,
      description,
      clientId,
      technicianId: technicianId || null,
      priority: priority || "medium",
      scheduledAt: new Date(scheduledAt),
    });

    // Add job to client's jobs array
    client.jobs.push(job._id);
    await client.save();

    // Add job to technician's assignedJobs array (if assigned)
    if (technicianId) {
      const technician = await Technician.findById(technicianId);
      technician.assignedJobs.push(job._id);
      await technician.save();
    }

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: error.message,
    });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      });

    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id)
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("notes.addedBy", "name email");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch job",
      error: error.message,
    });
  }
};

export const getClientJobs = async (req, res) => {
  try {
    const { clientId } = req.params;

    const jobs = await Job.find({ clientId })
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      });

    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch client jobs",
      error: error.message,
    });
  }
};

export const getTechnicianJobs = async (req, res) => {
  try {
    const { technicianId } = req.params;

    const jobs = await Job.find({ technicianId })
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      });

    res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch technician jobs",
      error: error.message,
    });
  }
};

export const assignTechnician = async (req, res) => {
  try {
    const { jobId, technicianId } = req.body;

    if (!jobId || !technicianId) {
      return res.status(400).json({
        success: false,
        message: "Please provide job and technician IDs",
      });
    }

    // Check if technician exists
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
      });
    }

    // Update job with technician
    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        technicianId,
        status: "assigned",
      },
      { new: true },
    )
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Add job to technician's assigned jobs
    if (!technician.assignedJobs.includes(jobId)) {
      technician.assignedJobs.push(jobId);
      await technician.save();
    }

    res.status(200).json({
      success: true,
      message: "Technician assigned successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to assign technician",
      error: error.message,
    });
  }
};

export const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Please provide job status",
      });
    }

    const validStatuses = [
      "pending",
      "assigned",
      "in-progress",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updateData = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const job = await Job.findByIdAndUpdate(jobId, updateData, { new: true })
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job status updated successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update job status",
      error: error.message,
    });
  }
};

export const addNote = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Please provide note text",
      });
    }

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        $push: {
          notes: {
            text,
            addedBy: req.user.id,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    )
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("notes.addedBy", "name email");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Note added successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add note",
      error: error.message,
    });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { title, description, priority, scheduledAt } = req.body;

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        title,
        description,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
      { new: true, runValidators: true },
    )
      .populate({ path: "clientId", populate: { path: "userId", select: "name email" } })
      .populate({
        path: "technicianId",
        populate: { path: "userId", select: "name email" },
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update job",
      error: error.message,
    });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findByIdAndDelete(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Remove job from client's jobs array
    await Client.findByIdAndUpdate(job.clientId, {
      $pull: { jobs: jobId },
    });

    // Remove job from technician's jobs array if assigned
    if (job.technicianId) {
      await Technician.findByIdAndUpdate(job.technicianId, {
        $pull: { assignedJobs: jobId },
      });
    }

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete job",
      error: error.message,
    });
  }
};
