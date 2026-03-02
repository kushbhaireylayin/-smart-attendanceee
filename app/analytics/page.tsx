"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChartBarIcon, 
  CalendarIcon, 
  ArrowDownTrayIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";

interface SubjectAttendance {
  id: string;
  code: string;
  name: string;
  semester: number;
  total: number;
  present: number;
  percentage: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  period: number;
  status: string;
  confidence: number;
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    presentCount: 0,
    attendancePercentage: 0,
    subjectsCount: 0
  });
  const [subjectAttendance, setSubjectAttendance] = useState<SubjectAttendance[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [chartData, setChartData] = useState<{ month: string; attendance: number }[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch user data with analytics
      const response = await fetch("/api/analytics");
      const data = await response.json();
      
      if (data) {
        setStats({
          totalClasses: data.totalClasses || 0,
          presentCount: data.presentCount || 0,
          attendancePercentage: data.attendancePercentage || 0,
          subjectsCount: data.subjectsCount || 0
        });
        setSubjectAttendance(data.subjectAttendance || []);
        setAttendanceHistory(data.attendanceHistory || []);
        setChartData(data.chartData || []);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-500">Your attendance insights</p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Total Classes</p>
            <p className="text-3xl font-bold text-gray-800">{stats.totalClasses}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Present</p>
            <p className="text-3xl font-bold text-green-600">{stats.presentCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Attendance Rate</p>
            <p className="text-3xl font-bold text-blue-600">{stats.attendancePercentage}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Subjects</p>
            <p className="text-3xl font-bold text-purple-600">{stats.subjectsCount}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Attendance Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Monthly Attendance Trend</h2>
            <div className="h-64 flex items-end space-x-2">
              {chartData.map((data) => (
                <div key={data.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-100 rounded-t-lg relative" style={{ height: '100%' }}>
                    <div 
                      className="absolute bottom-0 w-full bg-blue-600 rounded-t-lg transition-all duration-500"
                      style={{ height: `${data.attendance}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 mt-2">{data.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject-wise Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Subject-wise Performance</h2>
            <div className="space-y-4">
              {subjectAttendance.map((subject) => (
                <div key={subject.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-gray-600">{subject.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        subject.percentage >= 75 ? 'bg-green-500' :
                        subject.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${subject.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {subject.present}/{subject.total} classes
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Attendance Table */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Detailed Attendance History</h2>
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
                {attendanceHistory.map((att) => (
                  <tr key={att.id} className="hover:bg-gray-50">
                    <td className="p-3 text-sm">
                      {new Date(att.date).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-sm">{att.subject?.name}</td>
                    <td className="p-3 text-sm">{att.period}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        att.status === "PRESENT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {att.confidence ? `${Math.round(att.confidence * 100)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}