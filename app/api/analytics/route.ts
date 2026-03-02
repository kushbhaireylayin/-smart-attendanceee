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

    // Get user with enrollments and attendances
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        enrollments: {
          include: {
            subject: true
          }
        },
        attendances: {
          include: {
            subject: true
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    });

    // Calculate statistics
    const totalClasses = user?.attendances.length || 0;
    const presentCount = user?.attendances.filter(a => a.status === "PRESENT").length || 0;
    const attendancePercentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;

    // Subject-wise attendance
    const subjects = user?.enrollments.map(e => e.subject) || [];
    const subjectAttendance = await Promise.all(
      subjects.map(async (subject) => {
        const total = await prisma.attendance.count({
          where: {
            studentId: session.user.id,
            subjectId: subject.id,
          },
        });
        
        const present = await prisma.attendance.count({
          where: {
            studentId: session.user.id,
            subjectId: subject.id,
            status: "PRESENT",
          },
        });
        
        const percentage = total > 0 ? (present / total) * 100 : 0;
        
        return {
          id: subject.id,
          code: subject.code,
          name: subject.name,
          semester: subject.semester,
          total,
          present,
          percentage,
        };
      })
    );

    // Monthly attendance data
    const monthlyData = user?.attendances.reduce((acc: any, att) => {
      const month = new Date(att.date).toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { present: 0, total: 0 };
      }
      acc[month].total++;
      if (att.status === "PRESENT") {
        acc[month].present++;
      }
      return acc;
    }, {});

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = months.map(month => ({
      month,
      attendance: monthlyData?.[month] ? (monthlyData[month].present / monthlyData[month].total) * 100 : 0
    }));

    return NextResponse.json({
      totalClasses,
      presentCount,
      attendancePercentage,
      subjectsCount: subjects.length,
      subjectAttendance,
      attendanceHistory: user?.attendances || [],
      chartData
    });

  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}