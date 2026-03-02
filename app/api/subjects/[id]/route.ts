import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// DELETE /api/subjects/[id] - Delete a subject
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("📌 DELETE subject API called");
    
    const session = await getServerSession(authOptions);
    console.log("👤 Session:", session?.user?.email, "Role:", session?.user?.role);
    
    if (!session || session.user.role !== "ADMIN") {
      console.log("❌ Unauthorized - not admin");
      return NextResponse.json(
        { error: "Unauthorized. Admin only." },
        { status: 403 }
      );
    }

    const { id } = await params;
    console.log("🔍 Deleting subject with ID:", id);

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        enrollments: true,
        teachings: true,
        attendances: true
      }
    });

    if (!subject) {
      console.log("❌ Subject not found");
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    console.log("📊 Subject found:", subject.name);
    console.log("📊 Related data:", {
      enrollments: subject.enrollments.length,
      teachings: subject.teachings.length,
      attendances: subject.attendances.length
    });

    // Delete subject and related records in a transaction
    await prisma.$transaction([
      prisma.enrollment.deleteMany({ where: { subjectId: id } }),
      prisma.teaching.deleteMany({ where: { subjectId: id } }),
      prisma.attendance.deleteMany({ where: { subjectId: id } }),
      prisma.subject.delete({ where: { id } })
    ]);

    console.log("✅ Subject deleted successfully");
    
    return NextResponse.json({
      success: true,
      message: "Subject deleted successfully"
    });
    
  } catch (error) {
    console.error("❌ Error deleting subject:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete subject" },
      { status: 500 }
    );
  }
}

// PATCH /api/subjects/[id] - Update a subject
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("📌 PATCH subject API called");
    
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin only." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    console.log("🔍 Updating subject:", id, body);

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id }
    });

    if (!existingSubject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // Check if code is being changed and if new code already exists
    if (body.code && body.code !== existingSubject.code) {
      const codeExists = await prisma.subject.findUnique({
        where: { code: body.code }
      });
      
      if (codeExists) {
        return NextResponse.json(
          { error: "Subject code already exists" },
          { status: 400 }
        );
      }
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        credits: body.credits,
        semester: body.semester,
        department: body.department
      }
    });

    console.log("✅ Subject updated successfully");
    
    return NextResponse.json(subject);
    
  } catch (error) {
    console.error("❌ Error updating subject:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subject" },
      { status: 500 }
    );
  }
}

// GET /api/subjects/[id] - Get a single subject
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        teachings: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rollNumber: true
              }
            }
          }
        }
      }
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(subject);
    
  } catch (error) {
    console.error("Error fetching subject:", error);
    return NextResponse.json(
      { error: "Failed to fetch subject" },
      { status: 500 }
    );
  }
}