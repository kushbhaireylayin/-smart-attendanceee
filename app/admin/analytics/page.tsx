"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  AcademicCapIcon,
  CalendarIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: number;
  department: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
}

interface Attendance {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  period: number;
  status: string;
  confidence: number;
  subject: Subject;
}

export default function StudentAnalyticsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    presentCount: 0,
    attendancePercentage: 0,
    uniqueSubjects: 0,
    averageConfidence: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (attendances.length > 0) {
      calculateStats();
    }
  }, [attendances, selectedSubject]);

  const fetchData = async () => {
    try {
      const [studentsRes, subjectsRes, attendanceRes] = await Promise.all([
        fetch("/api/users?role=STUDENT"),
        fetch("/api/subjects"),
        fetch("/api/attendance")
      ]);

      const studentsData = await studentsRes.json();
      const subjectsData = await subjectsRes.json();
      const attendanceData = await attendanceRes.json();

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      
      const attendanceList = attendanceData.attendances || [];
      setAttendances(Array.isArray(attendanceList) ? attendanceList : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    let filteredAttendances = attendances;

    // Filter by student
    if (selectedStudent) {
      filteredAttendances = filteredAttendances.filter(a => a.studentId === selectedStudent);
    }

    // Filter by subject
    if (selectedSubject !== "all") {
      filteredAttendances = filteredAttendances.filter(a => a.subjectId === selectedSubject);
    }

    // Filter by date range
    if (dateRange.from) {
      filteredAttendances = filteredAttendances.filter(a => 
        new Date(a.date) >= new Date(dateRange.from)
      );
    }
    if (dateRange.to) {
      filteredAttendances = filteredAttendances.filter(a => 
        new Date(a.date) <= new Date(dateRange.to)
      );
    }

    const total = filteredAttendances.length;
    const present = filteredAttendances.filter(a => a.status === "PRESENT").length;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    const uniqueSubjects = new Set(filteredAttendances.map(a => a.subjectId)).size;
    const avgConfidence = filteredAttendances.reduce((acc, a) => acc + (a.confidence || 0), 0) / total || 0;

    setStats({
      totalClasses: total,
      presentCount: present,
      attendancePercentage: percentage,
      uniqueSubjects,
      averageConfidence: avgConfidence
    });
  };

  const getStudentAttendance = (studentId: string) => {
    const studentAttendances = attendances.filter(a => a.studentId === studentId);
    const total = studentAttendances.length;
    const present = studentAttendances.filter(a => a.status === "PRESENT").length;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    return { total, present, percentage };
  };

  const downloadReport = () => {
    const reportData = students.map(student => {
      const stats = getStudentAttendance(student.id);
      return {
        Name: student.name,
        Email: student.email,
        "Roll Number": student.rollNumber || "N/A",
        Semester: student.semester || "N/A",
        Department: student.department || "N/A",
        "Total Classes": stats.total,
        "Present": stats.present,
        "Attendance %": stats.percentage.toFixed(1) + "%"
      };
    });

    const csv = [
      Object.keys(reportData[0]).join(','),
      ...reportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Student Attendance Analytics</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full border p-2 rounded"
              >
                <option value="">All Students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border p-2 rounded"
              >
                <option value="all">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Total Classes</p>
              <CalendarIcon className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalClasses}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Present</p>
              <UserGroupIcon className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.presentCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Attendance %</p>
              <ChartBarIcon className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.attendancePercentage.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Subjects</p>
              <AcademicCapIcon className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.uniqueSubjects}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Avg Confidence</p>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{(stats.averageConfidence * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Student List with Attendance */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Student Attendance Summary</h2>
            <button
              onClick={downloadReport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Download Report</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Name</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Email</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Roll No</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Semester</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Department</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Total</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Present</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Percentage</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student) => {
                  const stats = getStudentAttendance(student.id);
                  const statusColor = stats.percentage >= 75 ? "green" : stats.percentage >= 60 ? "yellow" : "red";
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">{student.name}</td>
                      <td className="p-3 text-sm">{student.email}</td>
                      <td className="p-3 text-sm">{student.rollNumber || "N/A"}</td>
                      <td className="p-3 text-sm">{student.semester || "N/A"}</td>
                      <td className="p-3 text-sm">{student.department || "N/A"}</td>
                      <td className="p-3 text-sm font-medium">{stats.total}</td>
                      <td className="p-3 text-sm text-green-600 font-medium">{stats.present}</td>
                      <td className="p-3 text-sm font-medium">{stats.percentage.toFixed(1)}%</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          statusColor === "green" ? "bg-green-100 text-green-700" :
                          statusColor === "yellow" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {stats.percentage >= 75 ? "Good" : stats.percentage >= 60 ? "Average" : "Low"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subject-wise Analysis */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-lg font-semibold p-6 border-b">Subject-wise Attendance Analysis</h2>
          <div className="overflow-x-auto p-4">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Subject</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Code</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Semester</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Total Classes</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Avg Attendance</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subjects.map((subject) => {
                  const subjectAttendances = attendances.filter(a => a.subjectId === subject.id);
                  const total = subjectAttendances.length;
                  const present = subjectAttendances.filter(a => a.status === "PRESENT").length;
                  const percentage = total > 0 ? (present / total) * 100 : 0;
                  const uniqueStudents = new Set(subjectAttendances.map(a => a.studentId)).size;

                  return (
                    <tr key={subject.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">{subject.name}</td>
                      <td className="p-3 text-sm">{subject.code}</td>
                      <td className="p-3 text-sm">{subject.semester}</td>
                      <td className="p-3 text-sm">{total}</td>
                      <td className="p-3 text-sm font-medium">{percentage.toFixed(1)}%</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          percentage >= 75 ? "bg-green-100 text-green-700" :
                          percentage >= 60 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {percentage >= 75 ? "Good" : percentage >= 60 ? "Average" : "Low"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}