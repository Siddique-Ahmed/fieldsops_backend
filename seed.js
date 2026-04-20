import User from "../model/User.js";
import Admin from "../model/Admin.js";
import Client from "../model/Client.js";
import Technician from "../model/Technician.js";
import Job from "../model/Job.js";
import connectDB from "../config/db.config.js";
import dotenv from "dotenv";

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Admin.deleteMany({});
    await Client.deleteMany({});
    await Technician.deleteMany({});
    await Job.deleteMany({});

    console.log("Cleared existing data");

    // Create Admin
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@fieldops.com",
      password: "password123",
      role: "admin",
    });

    const admin = await Admin.create({
      userId: adminUser._id,
      department: "Management",
      permissions: [
        "create_jobs",
        "assign_technicians",
        "manage_users",
        "view_reports",
      ],
    });

    adminUser.profileRef.admin = admin._id;
    await adminUser.save();

    console.log("✓ Admin created: admin@fieldops.com");

    // Create Technicians
    const tech1User = await User.create({
      name: "John Smith",
      email: "tech@fieldops.com",
      password: "password123",
      role: "technician",
    });

    const tech1 = await Technician.create({
      userId: tech1User._id,
      skillSet: ["HVAC", "Plumbing", "Electrical"],
      completedJobs: 45,
      rating: 4.8,
      availability: true,
    });

    tech1User.profileRef.technician = tech1._id;
    await tech1User.save();

    console.log("✓ Technician created: tech@fieldops.com");

    const tech2User = await User.create({
      name: "Sarah Johnson",
      email: "tech2@fieldops.com",
      password: "password123",
      role: "technician",
    });

    const tech2 = await Technician.create({
      userId: tech2User._id,
      skillSet: ["Electrical", "Solar Panels"],
      completedJobs: 32,
      rating: 4.6,
      availability: true,
    });

    tech2User.profileRef.technician = tech2._id;
    await tech2User.save();

    // Create Clients
    const client1User = await User.create({
      name: "Mike Johnson",
      email: "client@fieldops.com",
      password: "password123",
      role: "client",
    });

    const client1 = await Client.create({
      userId: client1User._id,
      companyName: "ABC Manufacturing",
      phone: "+1-555-0123",
      address: {
        street: "123 Industrial Ave",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA",
      },
      jobs: [],
    });

    client1User.profileRef.client = client1._id;
    await client1User.save();

    console.log("✓ Client created: client@fieldops.com");

    const client2User = await User.create({
      name: "Lisa Anderson",
      email: "client2@fieldops.com",
      password: "password123",
      role: "client",
    });

    const client2 = await Client.create({
      userId: client2User._id,
      companyName: "Tech Solutions Inc",
      phone: "+1-555-0456",
      address: {
        street: "456 Tech Boulevard",
        city: "San Francisco",
        state: "CA",
        zipCode: "94105",
        country: "USA",
      },
      jobs: [],
    });

    client2User.profileRef.client = client2._id;
    await client2User.save();

    // Create Jobs
    const job1 = await Job.create({
      title: "Fix HVAC System",
      description:
        "Air conditioning system needs repair. Unit is not cooling properly.",
      status: "in-progress",
      clientId: client1._id,
      technicianId: tech1._id,
      priority: "high",
      scheduledAt: new Date("2024-04-25T10:00:00Z"),
      notes: [
        {
          text: "Checked compressor - needs replacement",
          addedBy: tech1User._id,
          createdAt: new Date(),
        },
      ],
    });

    tech1.assignedJobs.push(job1._id);
    await tech1.save();
    client1.jobs.push(job1._id);
    await client1.save();

    console.log("✓ Job 1 created: Fix HVAC System");

    const job2 = await Job.create({
      title: "Electrical Panel Upgrade",
      description:
        "Install new circuit breaker panel. Current capacity is 100A, upgrade to 200A.",
      status: "pending",
      clientId: client1._id,
      priority: "medium",
      scheduledAt: new Date("2024-04-28T14:00:00Z"),
      notes: [],
    });

    client1.jobs.push(job2._id);
    await client1.save();

    console.log("✓ Job 2 created: Electrical Panel Upgrade");

    const job3 = await Job.create({
      title: "Solar Panel Installation",
      description:
        "Install 20 solar panels on roof. Estimated 8-10 hours of work.",
      status: "assigned",
      clientId: client2._id,
      technicianId: tech2._id,
      priority: "high",
      scheduledAt: new Date("2024-04-26T08:00:00Z"),
      notes: [
        {
          text: "Roof inspection completed - ready for installation",
          addedBy: tech2User._id,
          createdAt: new Date(),
        },
      ],
    });

    tech2.assignedJobs.push(job3._id);
    await tech2.save();
    client2.jobs.push(job3._id);
    await client2.save();

    console.log("✓ Job 3 created: Solar Panel Installation");

    const job4 = await Job.create({
      title: "Plumbing Inspection",
      description:
        "Full home plumbing inspection and pressure test. Check for leaks.",
      status: "completed",
      clientId: client2._id,
      technicianId: tech1._id,
      priority: "low",
      scheduledAt: new Date("2024-04-20T09:00:00Z"),
      completedAt: new Date("2024-04-20T11:30:00Z"),
      notes: [
        {
          text: "All pipes checked - no leaks detected",
          addedBy: tech1User._id,
          createdAt: new Date(),
        },
        {
          text: "Minor issue in kitchen - water pressure slightly low",
          addedBy: client2User._id,
          createdAt: new Date(),
        },
      ],
    });

    client2.jobs.push(job4._id);
    await client2.save();

    console.log("✓ Job 4 created: Plumbing Inspection");

    console.log("\n✅ Database seeded successfully!\n");
    console.log("Demo Credentials:");
    console.log("─────────────────");
    console.log("Admin:      admin@fieldops.com / password123");
    console.log("Technician: tech@fieldops.com / password123");
    console.log("Client:     client@fieldops.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
