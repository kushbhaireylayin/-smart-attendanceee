import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const prisma = new PrismaClient();

const enrollmentSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  academicYear: z.string()
});

export async function GET() {
  try {
    const enrollments = await prisma.enrollment.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            semester: true
          }
        },
        subject: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(enrollments);
    
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin only." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = enrollmentSchema.parse(body);

    // Check if enrollment already exists
    const existing = await prisma.enrollment.findFirst({
      where: {
        studentId: parsed.studentId,
        subjectId: parsed.subjectId,
        academicYear: parsed.academicYear
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Student already enrolled in this subject for this academic year" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: parsed,
      include: {
        student: true,
        subject: true
      }
    });

    return NextResponse.json(enrollment, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating enrollment:", error);
    return NextResponse.json(
      { error: "Failed to enroll student" },
      { status: 500 }
    );
  }
}