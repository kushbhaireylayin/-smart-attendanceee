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

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  confidence: number;
}

export default function AttendancePage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [recognizedStudent, setRecognizedStudent] = useState<Student | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Fetch all students with face data on component mount
  useEffect(() => {
    fetchStudents();
    checkTodayAttendance();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students");
      if (!response.ok) throw new Error("Failed to fetch students");
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage({
        type: 'error',
        text: "Failed to load student data"
      });
    }
  };

  const checkTodayAttendance = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`/api/attendance?date=${today}`);
      if (!response.ok) throw new Error("Failed to check attendance");
      
      const data = await response.json();
      setCheckingStatus(false);
    } catch (error) {
      console.error("Error checking attendance:", error);
      setCheckingStatus(false);
    }
  };

  const handleFaceDetected = async (descriptor: Float32Array, imageSrc: string) => {
    if (students.length === 0) {
      setMessage({
        type: 'error',
        text: "No registered students found. Please register first."
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    setRecognizedStudent(null);

    try {
      // Prepare face data array for comparison
      const faceDataArray = students.map(student => ({
        userId: student.id,
        descriptor: arrayToDescriptor(student.faceDescriptor)
      }));

      // Find best match among registered students
      const match = findBestMatch(descriptor, faceDataArray, 0.6);

      if (match.userId) {
        const matchedStudent = students.find(s => s.id === match.userId);
        
        if (matchedStudent) {
          // Mark attendance
          const response = await fetch("/api/attendance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              studentId: matchedStudent.id,
              confidence: match.confidence,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            setRecognizedStudent(matchedStudent);
            setTodayAttendance(data.attendance);
            setMessage({
              type: 'success',
              text: `✓ Attendance marked for ${matchedStudent.name}!`
            });
          } else {
            if (response.status === 400 && data.error.includes("already marked")) {
              setMessage({
                type: 'info',
                text: "You have already marked your attendance today."
              });
              setRecognizedStudent(matchedStudent);
            } else {
              throw new Error(data.error || "Failed to mark attendance");
            }
          }
        }
      } else {
        setMessage({
          type: 'error',
          text: "Face not recognized. Please ensure you are registered and try again."
        });
      }
    } catch (error: any) {
      console.error("Attendance error:", error);
      setMessage({
        type: 'error',
        text: error.message || "Error processing attendance"
      });
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <CameraIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mark Your Attendance
          </h1>
          <p className="text-gray-600 mt-2">
            Look at the camera to automatically mark your attendance
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-600">{students.length}</div>
            <div className="text-sm text-gray-600">Registered Students</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-purple-600">
              {new Date().toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">Today's Date</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">
              {todayAttendance ? '✓' : '—'}
            </div>
            <div className="text-sm text-gray-600">Your Status Today</div>
          </div>
        </div>

        {/* Message Display */}
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

        {/* Recognized Student Info */}
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
              {todayAttendance && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium text-gray-800">
                    {new Date(todayAttendance.date).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Webcam Capture */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <WebcamCapture
            onFaceDetected={handleFaceDetected}
            onError={(error) => setMessage({ type: 'error', text: error })}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-4 text-center text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Processing...</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">i</span>
            Instructions:
          </h3>
          <ul className="text-sm text-gray-600 space-y-2 list-none">
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              Ensure good lighting on your face
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              Remove glasses or anything covering your face if needed
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              Look directly at the camera
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              Wait for the system to recognize you
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              You'll see a confirmation once attendance is marked
            </li>
          </ul>
        </div>

        {/* Navigation */}
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