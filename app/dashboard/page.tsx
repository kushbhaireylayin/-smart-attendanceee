import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user?.role === "ADMIN";

  let attendances: any[] = [];
  let enrollments: any[] = [];
  
  if (!isAdmin) {
    attendances = await prisma.attendance.findMany({
      where: {
        studentId: session.user.id
      },
      include: {
        subject: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: session.user.id
      },
      include: {
        subject: true
      }
    });
  }

  const totalClasses = attendances.length;
  const presentCount = attendances.filter(a => a.status === "PRESENT").length;
  const attendancePercentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;

  const today = new Date();
  const todayStr = today.toDateString();
  const hasTodayAttendance = attendances.some(a => new Date(a.date).toDateString() === todayStr);
  const todaySubjects = attendances.filter(a => new Date(a.date).toDateString() === todayStr);

  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const uniqueSubjectsFromAttendance = new Set(attendances.map(a => a.subjectId)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Attendance Dashboard</h1>
            <div className="flex items-center space-x-6">
              <span className="text-gray-600">{formattedDate}</span>
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-700">{session.user?.name}</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                  {session.user?.role}
                </span>
              </div>
              <form action="/api/auth/signout" method="POST">
                <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, {session.user?.name}! 🎉</h2>
          <p className="text-gray-600">
            {isAdmin 
              ? "Manage your institution from here" 
              : "Here's your attendance summary and updates"}
          </p>
        </div>

        {/* Stats Cards */}
        {isAdmin ? (
          // ADMIN STATS
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Total Students</p>
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{await prisma.user.count({ where: { role: "STUDENT" } })}</p>
              <p className="text-sm text-gray-400 mt-2">Enrolled</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Teachers</p>
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{await prisma.user.count({ where: { role: "TEACHER" } })}</p>
              <p className="text-sm text-gray-400 mt-2">Active</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Subjects</p>
                <span className="text-2xl">📚</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{await prisma.subject.count()}</p>
              <p className="text-sm text-gray-400 mt-2">Available</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Attendance</p>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{await prisma.attendance.count()}</p>
              <p className="text-sm text-gray-400 mt-2">Total Records</p>
            </div>
          </div>
        ) : (
          // STUDENT STATS
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Total Attendance</p>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{totalClasses}</p>
              <p className="text-sm text-gray-400 mt-2">All time</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Present Days</p>
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-gray-400 mt-2">{attendancePercentage}% of classes</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Attendance Rate</p>
                <span className="text-2xl">📈</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{attendancePercentage}%</p>
              <p className="text-sm text-gray-400 mt-2">Overall</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-gray-500">Subjects</p>
                <span className="text-2xl">📚</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{uniqueSubjectsFromAttendance}</p>
              <p className="text-sm text-gray-400 mt-2">Active</p>
            </div>
          </div>
        )}

        {/* STUDENT ONLY: Not Enrolled Warning */}
        {!isAdmin && enrollments.length === 0 && attendances.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800">Not Enrolled in Any Subjects</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Mark attendance for a subject and you'll be automatically enrolled!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT ONLY: Today's Status */}
        {!isAdmin && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Status</h3>
            {hasTodayAttendance ? (
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-medium text-green-700">Marked Present</p>
                    <p className="text-sm text-green-600">
                      {todaySubjects.map(s => s.subject?.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <p className="font-medium text-yellow-700">Not Marked Yet</p>
                    <p className="text-sm text-yellow-600">Attendance pending</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STUDENT ONLY: Quick Actions with Sick Leave Link */}
        {!isAdmin && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link 
                href="/attendance" 
                className="block bg-blue-50 rounded-lg p-4 border border-blue-100 hover:bg-blue-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="font-medium text-blue-700">Mark Attendance</p>
                    <p className="text-sm text-blue-600">Use face recognition</p>
                  </div>
                </div>
              </Link>

              {/* Sick Leave Link */}
              <Link 
                href="/student/sick-leave" 
                className="block bg-green-50 rounded-lg p-4 border border-green-100 hover:bg-green-100 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏥</span>
                  <div>
                    <p className="font-medium text-green-700">Sick Leave</p>
                    <p className="text-sm text-green-600">Apply for medical leave</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* ADMIN CONTROLS with Sick Leave Link */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Link 
                href="/admin/subjects" 
                className="p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">📚</span>
                  <div>
                    <p className="font-medium text-blue-700">Subjects</p>
                    <p className="text-sm text-gray-600">Manage subjects</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/admin/teachers" 
                className="p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">👨‍🏫</span>
                  <div>
                    <p className="font-medium text-green-700">Teachers</p>
                    <p className="text-sm text-gray-600">Assign subjects</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/admin/students" 
                className="p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">👥</span>
                  <div>
                    <p className="font-medium text-purple-700">Student List</p>
                    <p className="text-sm text-gray-600">View registered students</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/admin/analytics" 
                className="p-4 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 transition group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">📊</span>
                  <div>
                    <p className="font-medium text-orange-700">Analytics</p>
                    <p className="text-sm text-gray-600">Student attendance reports</p>
                  </div>
                </div>
              </Link>

              {/* Admin Sick Leave Link */}
              <Link 
                href="/admin/sick-leave" 
                className="p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">🏥</span>
                  <div>
                    <p className="font-medium text-red-700">Sick Leaves</p>
                    <p className="text-sm text-gray-600">Manage applications</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* STUDENT ONLY: Recent Activity */}
        {!isAdmin && attendances.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {attendances.slice(0, 5).map((att) => (
                <div key={att.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-green-500">✓</span>
                    <div>
                      <p className="font-medium text-gray-800">{att.subject?.name || 'Unknown Subject'}</p>
                      <p className="text-xs text-gray-500">Period {att.period}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(att.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
            <div className="text-center py-8">
              <p className="text-gray-500">No attendance records yet.</p>
              <p className="text-sm text-gray-400 mt-2">Mark your first attendance to see data here.</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}