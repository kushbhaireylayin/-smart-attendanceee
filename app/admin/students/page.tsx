"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrashIcon } from "@heroicons/react/24/outline";

interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: number;
  department: string;
  createdAt: string;
}

export default function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/users?role=STUDENT");
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const response = await fetch(`/api/users/${studentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({ text: "Student deleted successfully!", type: "success" });
        fetchStudents();
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      } else {
        const data = await response.json();
        setMessage({ text: data.error || "Failed to delete student", type: "error" });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      }
    } catch (error) {
      setMessage({ text: "Error deleting student", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Registered Students</h1>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          ← Back to Dashboard
        </Link>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {students.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No students registered yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Name</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Email</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Roll No</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Semester</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Department</th>
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
                  <td className="p-3 text-sm">{student.department || "N/A"}</td>
                  <td className="p-3 text-sm">
                    <button
                      onClick={() => setShowDeleteConfirm(student.id)}
                      className="text-red-600 hover:text-red-800 transition p-1"
                      title="Delete Student"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this student? This will also remove their face data and attendance records.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStudent(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        Total Students: {students.length}
      </div>
    </div>
  );
}