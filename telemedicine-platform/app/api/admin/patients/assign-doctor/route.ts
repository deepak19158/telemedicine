import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import connectDB from "../../../../../lib/db";
import User from "../../../../../server/models/User";

// POST /api/admin/patients/assign-doctor - Assign doctor to patient
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { patientId, doctorId, reason } = body;

    console.log(body);

    if (!patientId || !doctorId) {
      return NextResponse.json(
        { error: "Patient ID and Doctor ID are required" },
        { status: 400 }
      );
    }

    // Verify patient exists and is a patient
    const patient = await User.findOne({
      _id: patientId,
      role: "patient",
      isActive: true,
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found or inactive" },
        { status: 404 }
      );
    }

    // Verify doctor exists and is an active doctor
    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor",
      isActive: true,
      registrationStatus: "approved",
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doctor not found, inactive, or not approved" },
        { status: 404 }
      );
    }

    // Check if patient already has an assigned doctor
    const previousDoctor = patient.profile?.assignedDoctor;

    // Update patient with assigned doctor
    const updatedPatient = await User.findByIdAndUpdate(
      patientId,
      {
        $set: {
          "profile.assignedDoctor": doctorId,
          "profile.assignedAt": new Date(),
          "profile.assignedBy": session.user.id,
          "profile.assignmentReason": reason || "Admin assignment",
        },
      },
      { new: true }
    ).populate(
      "profile.assignedDoctor",
      "profile.name profile.specialization profile.consultationFee"
    );

    // Log the assignment for audit trail
    const assignmentLog = {
      patientId,
      doctorId,
      previousDoctor,
      assignedBy: session.user.id,
      reason,
      assignedAt: new Date(),
    };

    return NextResponse.json(
      {
        success: true,
        message: previousDoctor
          ? "Doctor assignment updated successfully"
          : "Doctor assigned to patient successfully",
        assignment: {
          patient: {
            id: updatedPatient._id,
            name: updatedPatient.profile.name,
            email: updatedPatient.email,
          },
          doctor: {
            id: doctor._id,
            name: doctor.profile.name,
            specialization: doctor.profile.specialization,
            consultationFee: doctor.profile.consultationFee,
          },
          assignedAt: updatedPatient.profile.assignedAt,
          assignedBy: session.user.id,
          reason: updatedPatient.profile.assignmentReason,
          previousDoctor: previousDoctor ? { id: previousDoctor } : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error assigning doctor to patient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/admin/patients/assign-doctor - Get assignment possibilities and statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 }
      );
    }

    await connectDB();

    // Get all active patients
    const patients = await User.find({
      role: "patient",
      isActive: true,
    })
      .select("profile.name email profile.assignedDoctor createdAt")
      .populate("profile.assignedDoctor", "profile.name profile.specialization")
      .sort({ createdAt: -1 });

    // Get all active and approved doctors
    const doctors = await User.find({
      role: "doctor",
      isActive: true,
      registrationStatus: "approved",
    }).select(
      "profile.name profile.specialization profile.consultationFee profile.experience"
    );

    // Calculate assignment statistics
    const assignmentStats = {
      totalPatients: patients.length,
      assignedPatients: patients.filter((p) => p.profile?.assignedDoctor)
        .length,
      unassignedPatients: patients.filter((p) => !p.profile?.assignedDoctor)
        .length,
      totalDoctors: doctors.length,
    };

    // Get doctor workload (number of assigned patients)
    const doctorWorkload = await User.aggregate([
      {
        $match: {
          role: "patient",
          isActive: true,
          "profile.assignedDoctor": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$profile.assignedDoctor",
          patientCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "doctor",
        },
      },
      {
        $unwind: "$doctor",
      },
      {
        $project: {
          doctorId: "$_id",
          doctorName: "$doctor.profile.name",
          specialization: "$doctor.profile.specialization",
          patientCount: 1,
        },
      },
      {
        $sort: { patientCount: -1 },
      },
    ]);

    // Format patients data
    const patientsData = patients.map((patient) => ({
      id: patient._id,
      name: patient.profile.name,
      email: patient.email,
      assignedDoctor: patient.profile?.assignedDoctor
        ? {
            id: patient.profile.assignedDoctor._id,
            name: patient.profile.assignedDoctor.profile.name,
            specialization:
              patient.profile.assignedDoctor.profile.specialization,
          }
        : null,
      isAssigned: !!patient.profile?.assignedDoctor,
      registeredAt: patient.createdAt,
    }));

    // Format doctors data
    const doctorsData = doctors.map((doctor) => {
      const workload = doctorWorkload.find(
        (w) => w.doctorId.toString() === doctor._id.toString()
      );
      return {
        id: doctor._id,
        name: doctor.profile.name,
        specialization: doctor.profile.specialization,
        consultationFee: doctor.profile.consultationFee,
        experience: doctor.profile.experience,
        assignedPatients: workload?.patientCount || 0,
      };
    });

    return NextResponse.json({
      success: true,
      stats: assignmentStats,
      patients: patientsData,
      doctors: doctorsData,
      doctorWorkload: doctorWorkload,
    });
  } catch (error) {
    console.error("Error fetching assignment data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
