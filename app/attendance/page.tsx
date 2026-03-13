"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import * as faceapi from 'face-api.js';
import Link from "next/link";

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  faceDescriptor: number[];
}

export default function AttendancePage() {
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [period, setPeriod] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [recognizedStudent, setRecognizedStudent] = useState<Student | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
        console.log("✅ Models loaded");
      } catch (error) {
        console.error("❌ Error loading models:", error);
      }
    };
    loadModels();
  }, []);

  // Fetch subjects and students
  useEffect(() => {
    Promise.all([
      fetch("/api/subjects").then(res => res.json()),
      fetch("/api/students").then(res => res.json())
    ]).then(([subjectsData, studentsData]) => {
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      if (subjectsData.length > 0) setSelectedSubject(subjectsData[0].id);
    }).finally(() => setLoading(false));
  }, []);

  // Face detection loop - ONLY DETECT, DON'T MARK ATTENDANCE
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !webcamRef.current) return;

    const interval = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }

        // Draw detections on canvas
        if (canvasRef.current && detections.length > 0) {
          const displaySize = { 
            width: video.videoWidth, 
            height: video.videoHeight 
          };
          
          if (displaySize.width > 0 && displaySize.height > 0) {
            faceapi.matchDimensions(canvasRef.current, displaySize);
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          }
        }

        // ONLY RECOGNIZE, DON'T MARK ATTENDANCE
        if (detections.length > 0 && students.length > 0) {
          for (const detection of detections) {
            for (const student of students) {
              if (student.faceDescriptor) {
                const storedDescriptor = new Float32Array(student.faceDescriptor);
                const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
                
                if (distance < 0.5) {
                  setRecognizedStudent(student);
                  setMessage({ text: `✅ Recognized: ${student.name}`, type: "success" });
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Detection error:", error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cameraActive, modelsLoaded, students]);

  // Mark attendance ONLY when user clicks the button
  const handleMarkAttendance = async () => {
    if (!recognizedStudent) {
      setMessage({ text: "❌ No student recognized", type: "error" });
      return;
    }

    if (!selectedSubject) {
      setMessage({ text: "❌ Please select a subject", type: "error" });
      return;
    }

    setMessage({ text: "⏳ Marking attendance...", type: "info" });

    try {
      // Auto-enroll if needed
      await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: recognizedStudent.id,
          subjectId: selectedSubject,
          academicYear: "2025-2026"
        })
      }).catch(() => {});

      // Mark attendance
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: recognizedStudent.id,
          subjectId: selectedSubject,
          period,
          confidence: 0.9,
          status: "PRESENT"
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "✅ Attendance marked successfully!", type: "success" });
      } else {
        setMessage({ text: `❌ ${data.error || "Failed to mark attendance"}`, type: "error" });
      }
    } catch (error) {
      console.error("Attendance error:", error);
      setMessage({ text: "❌ Error connecting to server", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2">Loading attendance system...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Mark Attendance</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Subject Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Subject & Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full border p-2 rounded"
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
                className="w-full border p-2 rounded"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Camera Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Face Recognition Camera</h2>
          
          {!cameraActive ? (
            <button
              onClick={() => setCameraActive(true)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
            >
              ▶️ Start Camera
            </button>
          ) : (
            <div>
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full"
                  videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  width={640}
                  height={480}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleMarkAttendance}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  ✅ Mark Attendance
                </button>
                <button
                  onClick={() => setCameraActive(false)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                >
                  ⏹️ Stop Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message.text && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.type === "success" ? "bg-green-100 text-green-700" : 
            message.type === "error" ? "bg-red-100 text-red-700" :
            "bg-blue-100 text-blue-700"
          }`}>
            {message.text}
          </div>
        )}

        {/* Recognized Student */}
        {recognizedStudent && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">🎯 Recognized Student:</h3>
            <p className="text-blue-700">Name: {recognizedStudent.name}</p>
            <p className="text-blue-700">Email: {recognizedStudent.email}</p>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-4 text-xs text-gray-400">
          <p>Models loaded: {modelsLoaded ? "✅" : "❌"}</p>
          <p>Students in DB: {students.length}</p>
          <p>Subjects: {subjects.length}</p>
        </div>
      </div>
    </div>
  );
}