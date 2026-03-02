import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // IMPORTANT: Await the params Promise first!
    const { id } = await params;
    console.log("✅ Delete API called with ID:", id);
    
    const session = await getServerSession(authOptions);
    console.log("👤 Session user:", session?.user?.email, "Role:", session?.user?.role);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin only" },
        { status: 403 }
      );
    }

    const userId = id;
    console.log("🔍 Looking for user with ID:", userId);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.log("❌ User not found");
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log("✅ Found user:", user.name, "Role:", user.role);

    // Delete user and related data
    await prisma.$transaction([
      prisma.faceData.deleteMany({ where: { userId } }),
      prisma.enrollment.deleteMany({ where: { studentId: userId } }),
      prisma.teaching.deleteMany({ where: { teacherId: userId } }),
      prisma.attendance.deleteMany({ where: { studentId: userId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);

    console.log("✅ User deleted successfully");

    return NextResponse.json({ 
      success: true,
      message: "User deleted successfully" 
    });
    
  } catch (error) {
    console.error("❌ Error in delete API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}