"use client";

import { useState, useEffect } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

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
  credits: number;
}

interface Enrollment {
  id: string;
  studentId: string;
  subjectId: string;
  academicYear: string;
  student: Student;
  subject: Subject;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log("Fetching students data...");
      
      // Fetch students
      const studentsRes = await fetch("/api/users?role=STUDENT");
      const studentsData = await studentsRes.json();
      console.log("Students fetched:", studentsData);
      setStudents(Array.isArray(studentsData) ? studentsData : []);

      // Fetch subjects
      const subjectsRes = await fetch("/api/subjects");
      const subjectsData = await subjectsRes.json();
      console.log("Subjects fetched:", subjectsData);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);

      // Fetch enrollments
      const enrollmentsRes = await fetch("/api/enrollments");
      const enrollmentsData = await enrollmentsRes.json();
      console.log("Enrollments fetched:", enrollmentsData);
      setEnrollments(Array.isArray(enrollmentsData) ? enrollmentsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ text: "Failed to load data", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!selectedStudent || !selectedSubject) {
      setMessage({ text: "Please select both student and subject", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      return;
    }

    try {
      console.log("Enrolling student:", selectedStudent, "in subject:", selectedSubject);
      
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          subjectId: selectedSubject,
          academicYear
        })
      });

      const data = await response.json();
      console.log("Enroll response:", data);

      if (response.ok) {
        setMessage({ text: "Student enrolled successfully!", type: "success" });
        setSelectedStudent("");
        setSelectedSubject("");
        
        // Refresh enrollments
        const enrollmentsRes = await fetch("/api/enrollments");
        const enrollmentsData = await enrollmentsRes.json();
        setEnrollments(Array.isArray(enrollmentsData) ? enrollmentsData : []);
        
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      } else {
        setMessage({ text: data.error || "Failed to enroll student", type: "error" });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      }
    } catch (error) {
      console.error("Error enrolling student:", error);
      setMessage({ text: "Error enrolling student", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      console.log("Attempting to delete student:", studentId);
      
      const response = await fetch(`/api/users/${studentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Delete response status:", response.status);
      
      const data = await response.json();
      console.log("Delete response data:", data);

      if (response.ok) {
        setMessage({ text: "Student deleted successfully!", type: "success" });
        
        // Refresh students list
        const studentsRes = await fetch("/api/users?role=STUDENT");
        const studentsData = await studentsRes.json();
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        
        // Refresh enrollments
        const enrollmentsRes = await fetch("/api/enrollments");
        const enrollmentsData = await enrollmentsRes.json();
        setEnrollments(Array.isArray(enrollmentsData) ? enrollmentsData : []);
        
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      } else {
        console.error("Delete failed. Status:", response.status, "Data:", data);
        
        // Handle different error cases
        let errorMessage = "Failed to delete student";
        
        if (response.status === 401) {
          errorMessage = "You are not logged in. Please login again.";
        } else if (response.status === 403) {
          errorMessage = "You don't have permission to delete students. Admin access required.";
        } else if (response.status === 404) {
          errorMessage = "Student not found. They may have been already deleted.";
        } else if (data?.error) {
          errorMessage = data.error;
        }
        
        setMessage({ text: errorMessage, type: "error" });
        setTimeout(() => setMessage({ text: "", type: "" }), 5000);
      }
    } catch (error) {
      console.error("Error in delete function:", error);
      setMessage({ text: "Error deleting student: " + (error instanceof Error ? error.message : "Unknown error"), type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Student Management</h1>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Enrollment Form */}
      <form onSubmit={handleEnroll} className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Enroll Student in Subject</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a student...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.email}) - Sem {student.semester || "N/A"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a subject...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name} (Sem {subject.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition"
            >
              Enroll Student
            </button>
          </div>
        </div>
      </form>

      {/* Students List with Delete Option */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <h2 className="text-lg font-semibold p-4 border-b flex justify-between items-center">
          <span>Registered Students ({students.length})</span>
        </h2>
        {students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No students registered yet.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Name</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Email</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Roll No</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Semester</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm">{student.name}</td>
                  <td className="p-3 text-sm">{student.email}</td>
                  <td className="p-3 text-sm">{student.rollNumber || "N/A"}</td>
                  <td className="p-3 text-sm">{student.semester || "N/A"}</td>
                  <td className="p-3 text-sm">
                    <button
                      onClick={() => setShowDeleteConfirm(student.id)}
                      className="text-red-600 hover:text-red-800 transition p-2"
                      title="Delete Student"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this student? This will also remove all their face data, enrollments, and attendance records. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStudent(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Enrollments */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b">Current Enrollments</h2>
        {enrollments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No students enrolled yet.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Student</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Roll No</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Subject</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Code</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Semester</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Academic Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm">{enrollment.student?.name || "Unknown"}</td>
                  <td className="p-3 text-sm">{enrollment.student?.rollNumber || "N/A"}</td>
                  <td className="p-3 text-sm">{enrollment.subject?.name || "Unknown"}</td>
                  <td className="p-3 text-sm">{enrollment.subject?.code || "N/A"}</td>
                  <td className="p-3 text-sm">{enrollment.subject?.semester || "N/A"}</td>
                  <td className="p-3 text-sm">{enrollment.academicYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-4 p-2 bg-gray-100 text-xs">
        <p>Students: {students.length} | Subjects: {subjects.length} | Enrollments: {enrollments.length}</p>
      </div>
    </div>
  );
}