import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// POST /api/attendance - Mark attendance for a recognized student
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { studentId, confidence, date } = body;

    // Validate required fields
    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { faceData: true }
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Use provided date or current date
    const attendanceDate = date ? new Date(date) : new Date();
    
    // Set to start of day for comparison
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance already marked for today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: studentId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { 
          error: "Attendance already marked for today",
          existing: existingAttendance 
        },
        { status: 400 }
      );
    }

    // Mark attendance
    const attendance = await prisma.attendance.create({
      data: {
        userId: studentId,
        confidence: confidence || null,
        status: "PRESENT",
        date: attendanceDate,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Log who marked the attendance (if teacher/admin)
    const markedBy = session?.user?.name || "Face Recognition System";

    return NextResponse.json({
      message: "Attendance marked successfully",
      attendance,
      markedBy,
    }, { status: 201 });
    
  } catch (error) {
    console.error("Attendance marking error:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}

// GET /api/attendance - Get attendance records (with filters)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Build where clause based on filters
    let whereClause: any = {};

    if (studentId) {
      whereClause.userId = studentId;
    }

    // Date filtering
    if (date) {
      // Specific date
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate && endDate) {
      // Date range
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: start,
        lte: end,
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.attendance.count({
      where: whereClause,
    });

    // Get attendance records with pagination
    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      attendances,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
    
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}

// DELETE /api/attendance?id=xxx - Delete an attendance record (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Attendance ID is required" },
        { status: 400 }
      );
    }

    // Check if attendance exists
    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Delete the record
    await prisma.attendance.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Attendance record deleted successfully",
    });
    
  } catch (error) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json(
      { error: "Failed to delete attendance record" },
      { status: 500 }
    );
  }
}