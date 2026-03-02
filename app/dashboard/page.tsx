import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  BookOpenIcon,
  AcademicCapIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CameraIcon
} from "@heroicons/react/24/outline";

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      enrollments: {
        include: {
          subject: true
        }
      },
      teachings: {
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
        },
        take: 10
      }
    }
  });

  // Calculate attendance statistics
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
        ...subject,
        total,
        present,
        percentage,
        color: percentage >= 75 ? 'green' : percentage >= 60 ? 'yellow' : 'red'
      };
    })
  );

  // For teachers
  const teachingSubjects = user?.teachings.map(t => t.subject) || [];

  // Get today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Modern Header with Glass Effect */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <AcademicCapIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Attendance Dashboard
                </h1>
                <p className="text-sm text-gray-500">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{session.user?.name}</p>
                <p className="text-xs text-gray-500">{session.user?.role}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {session.user?.name?.charAt(0)}
              </div>
              {/* Logout Button */}
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="ml-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
                >
                  <span>Logout</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {session.user?.name}! 👋</h2>
          <p className="text-blue-100">Here's your attendance summary and updates</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Attendance</p>
                <p className="text-3xl font-bold text-gray-800">{totalClasses}</p>
                <p className="text-xs text-gray-400 mt-2">All time</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg group-hover:scale-110 transition">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Present Days</p>
                <p className="text-3xl font-bold text-green-600">{presentCount}</p>
                <p className="text-xs text-gray-400 mt-2">{attendancePercentage}% of classes</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg group-hover:scale-110 transition">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Attendance Rate</p>
                <p className="text-3xl font-bold text-purple-600">{attendancePercentage}%</p>
                <p className="text-xs text-gray-400 mt-2">Overall</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg group-hover:scale-110 transition">
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Subjects</p>
                <p className="text-3xl font-bold text-orange-600">{subjects.length}</p>
                <p className="text-xs text-gray-400 mt-2">Enrolled</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg group-hover:scale-110 transition">
                <BookOpenIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Subject Cards */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Subject-wise Attendance</h2>
                <Link href="/analytics" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                  View Analytics
                  <ChartBarIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
              
              <div className="space-y-6">
                {subjectAttendance.map((subject) => (
                  <div key={subject.id} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="font-medium text-gray-800">{subject.name}</h3>
                        <p className="text-xs text-gray-500">{subject.code} • Semester {subject.semester}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-800">{subject.percentage.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">{subject.present}/{subject.total} classes</p>
                      </div>
                    </div>
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
                        <div
                          style={{ width: `${subject.percentage}%` }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            subject.color === 'green' ? 'bg-green-500' :
                            subject.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        ></div>
                      </div>
                      {subject.percentage < 75 && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <span className="mr-1">⚠️</span> Below 75% required
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="space-y-6">
            {/* Today's Status Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Status</h2>
              {user?.attendances && user.attendances.length > 0 && 
               new Date(user.attendances[0].date).toDateString() === new Date().toDateString() ? (
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700">Present</p>
                      <p className="text-xs text-green-600">
                        {new Date(user.attendances[0].date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <ClockIcon className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-yellow-700">Not Marked Yet</p>
                      <p className="text-xs text-yellow-600">Attendance pending</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/attendance"
                  className="block p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:shadow-md transition group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition">
                      <CameraIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Mark Attendance</p>
                      <p className="text-xs text-gray-500">Use face recognition</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/analytics"
                  className="block p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:scale-110 transition">
                      <ChartBarIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">View Analytics</p>
                      <p className="text-xs text-gray-500">Check your progress</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Teacher Section */}
            {session.user?.role === "TEACHER" && teachingSubjects.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Subjects</h2>
                <div className="space-y-3">
                  {teachingSubjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/teacher/attendance/${subject.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <p className="font-medium text-gray-800">{subject.name}</p>
                      <p className="text-xs text-gray-500">{subject.code} • Semester {subject.semester}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Admin Section */}
        {session.user?.role === "ADMIN" && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Admin Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Link
                href="/admin/subjects"
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500"
              >
                <div className="text-3xl mb-2">📚</div>
                <h3 className="font-semibold text-lg">Subjects</h3>
                <p className="text-sm text-gray-600 mt-1">Add and manage subjects</p>
              </Link>
              
              <Link
                href="/admin/teachers"
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-green-500"
              >
                <div className="text-3xl mb-2">👨‍🏫</div>
                <h3 className="font-semibold text-lg">Teachers</h3>
                <p className="text-sm text-gray-600 mt-1">Assign subjects to teachers</p>
              </Link>
              
              <Link
                href="/admin/students"
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-purple-500"
              >
                <div className="text-3xl mb-2">👥</div>
                <h3 className="font-semibold text-lg">Students</h3>
                <p className="text-sm text-gray-600 mt-1">Manage and delete students</p>
              </Link>
              
              <Link
                href="/admin/analytics"
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-orange-500"
              >
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-semibold text-lg">Analytics</h3>
                <p className="text-sm text-gray-600 mt-1">View all attendance data</p>
              </Link>
            </div>
          </div>
        )}

        {/* Recent Attendance Table */}
        {user?.attendances && user.attendances.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Attendance History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Date</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Subject</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Period</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {user.attendances.slice(0, 5).map((att) => (
                    <tr key={att.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-700">
                        {new Date(att.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-gray-700">{att.subject?.name}</td>
                      <td className="p-3 text-sm text-gray-700">{att.period}</td>
                      <td className="p-3 text-sm">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          {att.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {att.confidence ? `${Math.round(att.confidence * 100)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}