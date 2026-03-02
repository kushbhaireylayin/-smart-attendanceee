import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      orderBy: [
        { semester: 'asc' },
        { code: 'asc' }
      ]
    });

    return NextResponse.json(subjects);
    
  } catch (error) {
    console.error("Error fetching subjects:", error);
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
    
    const subject = await prisma.subject.create({
      data: {
        code: body.code,
        name: body.name,
        credits: body.credits,
        semester: body.semester,
        department: body.department
      }
    });

    return NextResponse.json(subject, { status: 201 });
    
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}