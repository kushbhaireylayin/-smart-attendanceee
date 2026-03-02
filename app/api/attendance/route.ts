import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const prisma = new PrismaClient();

const attendanceSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  period: z.number().int().min(1).max(8),
  date: z.string().optional(),
  confidence: z.number().optional(),
  status: z.string().default("PRESENT"),
});

// POST /api/attendance - Mark attendance
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = attendanceSchema.parse(body);

    // Use provided date or current date
    const attendanceDate = parsed.date ? new Date(parsed.date) : new Date();
    
    // Set to start of day for comparison
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance already marked for this student, subject, and period today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: parsed.studentId,
        subjectId: parsed.subjectId,
        period: parsed.period,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { 
          error: "Attendance already marked for this subject and period today",
          existing: existingAttendance 
        },
        { status: 400 }
      );
    }

    // Mark attendance
    const attendance = await prisma.attendance.create({
      data: {
        studentId: parsed.studentId,
        subjectId: parsed.subjectId,
        period: parsed.period,
        confidence: parsed.confidence || null,
        status: parsed.status,
        date: attendanceDate,
        markedBy: session.user.id, // The teacher/admin who marked it
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Attendance marked successfully",
      attendance,
    }, { status: 201 });
    
  } catch (error) {
    console.error("Attendance marking error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}

// GET /api/attendance - Get attendance records
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period");
    const limit = parseInt(searchParams.get("limit") || "100");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause: any = {};

    if (studentId) {
      whereClause.studentId = studentId;
    }

    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    if (period) {
      whereClause.period = parseInt(period);
    }

    // Date filtering
    if (date) {
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
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: start,
        lte: end,
      };
    }

    // Get total count
    const totalCount = await prisma.attendance.count({
      where: whereClause,
    });

    // Get attendance records
    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            semester: true,
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

// DELETE /api/attendance - Delete attendance record (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin only." },
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

    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

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