import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const prisma = new PrismaClient();

const teachingSchema = z.object({
  teacherId: z.string(),
  subjectId: z.string(),
  academicYear: z.string()
});

export async function GET() {
  try {
    const teachings = await prisma.teaching.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        subject: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(teachings);
    
  } catch (error) {
    console.error("Error fetching teachings:", error);
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
    const parsed = teachingSchema.parse(body);

    // Check if assignment already exists
    const existing = await prisma.teaching.findFirst({
      where: {
        teacherId: parsed.teacherId,
        subjectId: parsed.subjectId,
        academicYear: parsed.academicYear
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Subject already assigned to this teacher for this academic year" },
        { status: 400 }
      );
    }

    const teaching = await prisma.teaching.create({
      data: parsed,
      include: {
        teacher: true,
        subject: true
      }
    });

    return NextResponse.json(teaching, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Error creating teaching:", error);
    return NextResponse.json(
      { error: "Failed to assign subject" },
      { status: 500 }
    );
  }
}