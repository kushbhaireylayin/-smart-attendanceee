import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import Layout from "@/components/layout/Layout";
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  UserGroupIcon,
  ClockIcon 
} from "@heroicons/react/24/outline";

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAttendance = await prisma.attendance.findFirst({
    where: {
      userId: session.user.id,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  // Fetch total attendance count
  const totalAttendance = await prisma.attendance.count({
    where: {
      userId: session.user.id,
    },
  });

  // Fetch recent attendance records
  const recentAttendance = await prisma.attendance.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      date: "desc",
    },
    take: 5,
  });

  // Format date for member since
  const memberSince = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate attendance statistics
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  
  const monthlyAttendance = recentAttendance.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.getMonth() === thisMonth && recordDate.getFullYear() === thisYear;
  }).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold">Welcome back, {session.user?.name}! 👋</h1>
          <p className="text-blue-100 mt-2">Here's your attendance summary for today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Attendance Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Attendance</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{totalAttendance}</p>
                <p className="text-green-600 text-sm mt-2">+{monthlyAttendance} this month</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Today's Status Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Today's Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  {todayAttendance ? (
                    <>
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                      <p className="text-2xl font-bold text-green-600">Present</p>
                    </>
                  ) : (
                    <>
                      <ClockIcon className="h-6 w-6 text-yellow-500" />
                      <p className="text-2xl font-bold text-yellow-600">Not Marked</p>
                    </>
                  )}
                </div>
                {todayAttendance && (
                  <p className="text-gray-500 text-sm mt-2">
                    at {new Date(todayAttendance.date).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <div className={`p-3 ${todayAttendance ? 'bg-green-100' : 'bg-yellow-100'} rounded-lg`}>
                {todayAttendance ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : (
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                )}
              </div>
            </div>
          </div>

          {/* Member Since Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Member Since</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{memberSince}</p>
                <p className="text-gray-500 text-sm mt-2">{session.user?.role}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Quick Action Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-800">Quick Action</h3>
            <p className="text-sm text-gray-600 mt-1">Mark your attendance now</p>
            <a 
              href="/attendance"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Go to Camera →
            </a>
          </div>
        </div>

        {/* Today's Status Message */}
        {todayAttendance && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-700 flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              ✓ You've already marked attendance today at {new Date(todayAttendance.date).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* User Information Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium text-gray-800">{session.user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-800">{session.user?.role}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="font-medium text-gray-800">{session.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="font-medium text-gray-800 text-sm truncate">{session.user?.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Attendance History */}
        {recentAttendance.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Attendance History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Time</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentAttendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(record.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {record.confidence 
                          ? `${Math.round(record.confidence * 100)}%` 
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* View All Link */}
            <div className="mt-4 text-right">
              <a 
                href="/analytics" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
              >
                View Detailed Analytics
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No attendance records yet.</p>
            <a 
              href="/attendance" 
              className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Mark Your First Attendance
            </a>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="/attendance" 
            className="p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500"
          >
            <h3 className="font-semibold text-gray-800">📸 Mark Attendance</h3>
            <p className="text-sm text-gray-600 mt-1">Use face recognition to mark today's attendance</p>
          </a>
          <a 
            href="/register" 
            className="p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-green-500"
          >
            <h3 className="font-semibold text-gray-800">👤 Register New Student</h3>
            <p className="text-sm text-gray-600 mt-1">Add a new student with face capture</p>
          </a>
        </div>
      </div>
    </Layout>
  );
}