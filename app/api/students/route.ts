import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema for validating student registration data
const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]).default("STUDENT"),
  faceDescriptor: z.array(z.number()), // Array of numbers from Float32Array
  faceImage: z.string().optional(), // Base64 image data
});

// POST /api/students - Register a new student with face data
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    // Use a transaction to create both user and face data
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          password: hashedPassword,
          role: parsed.role,
        },
      });

      // Create face data record
      await tx.faceData.create({
        data: {
          userId: user.id,
          descriptor: JSON.stringify(parsed.faceDescriptor), // Store as JSON string
          imageUrl: parsed.faceImage, // Optional: store the captured image
        },
      });

      return user;
    });

    return NextResponse.json({
      message: "Student registered successfully",
      userId: result.id
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
      { error: "Failed to register student" },
      { status: 500 }
    );
  }
}

// GET /api/students - Get all students with their face data (for attendance marking)
export async function GET() {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        faceData: {
          isNot: null, // Only get students who have registered faces
        },
      },
      include: {
        faceData: true, // Include face data
      },
    });

    // Format the response to include face descriptors as arrays
    const formattedStudents = students.map(student => ({
      id: student.id,
      name: student.name,
      email: student.email,
      faceDescriptor: student.faceData ? JSON.parse(student.faceData.descriptor) : null,
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