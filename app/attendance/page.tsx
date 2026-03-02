"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WebcamCapture from "@/components/WebcamCapture";
import { arrayToDescriptor, findBestMatch } from "@/lib/face-recognition/faceApi";
import Layout from "@/components/layout/Layout";
import { CameraIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface Student {
  id: string;
  name: string;
  email: string;
  faceDescriptor: number[];
}

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  confidence: number;
  subjectId: string;
  period: number;
}

export default function AttendancePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [period, setPeriod] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [recognizedStudent, setRecognizedStudent] = useState<Student | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
    checkTodayAttendance();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      if (!response.ok) throw new Error("Failed to fetch subjects");
      const data = await response.json();
      setSubjects(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedSubject(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both array and paginated response
        const attendanceList = Array.isArray(data) ? data : data?.attendances || [];
        setTodayAttendance(attendanceList);
      }
    } catch (error) {
      console.error("Error checking attendance:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFaceDetected = async (descriptor: Float32Array, imageSrc: string) => {
    if (students.length === 0) {
      setMessage({ type: 'error', text: "No registered students found. Please register first." });
      return;
    }

    if (!selectedSubject) {
      setMessage({ type: 'error', text: "Please select a subject" });
      return;
    }

    setLoading(true);
    setMessage(null);
    setRecognizedStudent(null);

    try {
      const faceDataArray = students
        .map(student => ({
          userId: student.id,
          descriptor: student.faceDescriptor ? arrayToDescriptor(student.faceDescriptor) : null
        }))
        .filter(s => s.descriptor !== null) as { userId: string; descriptor: Float32Array }[];

      const match = findBestMatch(descriptor, faceDataArray, 0.6);

      if (match.userId) {
        const matchedStudent = students.find(s => s.id === match.userId);
        
        if (matchedStudent) {
          const alreadyMarked = todayAttendance.some(a => a.subjectId === selectedSubject);

          if (alreadyMarked) {
            setMessage({
              type: 'info',
              text: `You have already marked attendance for ${subjects.find(s => s.id === selectedSubject)?.name} today.`
            });
            setRecognizedStudent(matchedStudent);
            setLoading(false);
            return;
          }

          const response = await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: matchedStudent.id,
              subjectId: selectedSubject,
              period,
              confidence: match.confidence,
              status: "PRESENT"
            }),
          });

          const data = await response.json();

          if (response.ok) {
            setRecognizedStudent(matchedStudent);
            setMessage({
              type: 'success',
              text: `✓ Attendance marked for ${matchedStudent.name} in ${subjects.find(s => s.id === selectedSubject)?.name}!`
            });
            checkTodayAttendance();
          } else {
            if (response.status === 400) {
              if (data.error?.includes("already marked")) {
                setMessage({
                  type: 'info',
                  text: "You have already marked your attendance for this subject today."
                });
              } else {
                setMessage({ type: 'error', text: data.error || "Failed to mark attendance" });
              }
            } else {
              setMessage({ type: 'error', text: "Server error. Please try again." });
            }
          }
        }
      } else {
        setMessage({ type: 'error', text: "Face not recognized. Please try again." });
      }
    } catch (error: any) {
      console.error("Attendance error:", error);
      setMessage({ type: 'error', text: error.message || "Error processing attendance" });
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading attendance system...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <CameraIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mark Your Attendance
          </h1>
          <p className="text-gray-600 mt-2">Look at the camera to automatically mark your attendance</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a subject...</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(parseInt(e.target.value))}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-600">{students.length}</div>
            <div className="text-sm text-gray-600">Registered Students</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-purple-600">{new Date().toLocaleDateString()}</div>
            <div className="text-sm text-gray-600">Today's Date</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">{todayAttendance.length}</div>
            <div className="text-sm text-gray-600">Marked Today</div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {message.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />}
            {message.type === 'error' && <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />}
            <p className={`${
              message.type === 'success' ? 'text-green-700' :
              message.type === 'error' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {recognizedStudent && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">🎯 Recognized Student:</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-gray-800">{recognizedStudent.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-800">{recognizedStudent.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <WebcamCapture
            onFaceDetected={handleFaceDetected}
            onError={(error) => setMessage({ type: 'error', text: error })}
          />
        </div>

        {loading && (
          <div className="mt-4 text-center text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Processing...</p>
          </div>
        )}

        {todayAttendance.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
            <h3 className="font-semibold text-green-700 mb-2">✓ Today's Marked Attendance:</h3>
            <ul className="space-y-1">
              {todayAttendance.map((att) => {
                const subject = subjects.find(s => s.id === att.subjectId);
                return (
                  <li key={att.id} className="text-sm text-green-600">
                    {subject?.name} - Period {att.period} at {new Date(att.date).toLocaleTimeString()}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    </Layout>
  );
}