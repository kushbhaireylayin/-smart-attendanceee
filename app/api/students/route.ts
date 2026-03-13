import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();

// Updated schema to handle different roles
const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  // Student-specific fields (optional)
  rollNumber: z.string().optional(),
  semester: z.number().int().min(1).max(8).optional(),
  department: z.string().optional(),
  // Face data (optional for admin)
  faceDescriptor: z.array(z.number()).optional(),
  faceImage: z.string().optional(),
});

// POST /api/students - Register a new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input data
    const parsed = studentSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Check if roll number already exists (only for students)
    if (parsed.role === "STUDENT" && parsed.rollNumber) {
      const existingRollNumber = await prisma.user.findUnique({
        where: { rollNumber: parsed.rollNumber }
      });
      
      if (existingRollNumber) {
        return NextResponse.json(
          { error: "University Register Number already exists" },
          { status: 400 }
        );
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    // Prepare user data based on role
    const userData: any = {
      name: parsed.name,
      email: parsed.email,
      password: hashedPassword,
      role: parsed.role,
    };

    // Add student-specific fields only for students
    if (parsed.role === "STUDENT") {
      userData.rollNumber = parsed.rollNumber;
      userData.semester = parsed.semester;
      userData.department = parsed.department;
    }

    // Use a transaction to create user and optionally face data
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: userData,
      });

      // Create face data only for non-admin users and if faceDescriptor exists
      if (parsed.role !== "ADMIN" && parsed.faceDescriptor) {
        await tx.faceData.create({
          data: {
            userId: user.id,
            descriptor: JSON.stringify(parsed.faceDescriptor),
            imageUrl: parsed.faceImage,
          },
        });
      }

      return user;
    });

    return NextResponse.json({
      message: "Registration successful",
      userId: result.id,
      role: result.role
    }, { status: 201 });
    
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to register" },
      { status: 500 }
    );
  }
}

// GET /api/students - Get all students with their face data
export async function GET() {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        faceData: {
          isNot: null,
        },
      },
      include: {
        faceData: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Format the response to include all fields
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      semester: student.semester,
      department: student.department,
      faceDescriptor: student.faceData ? JSON.parse(student.faceData.descriptor) : null,
      createdAt: student.createdAt
    }));

    return NextResponse.json(formattedStudents);
    
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}