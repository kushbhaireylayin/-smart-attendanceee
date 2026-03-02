"use client";

import { useState, useEffect } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  department: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    credits: 3,
    semester: 1,
    department: "BCA"
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subjects");
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSubjects(data);
      } else {
        console.error("API did not return array:", data);
        setSubjects([]);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    
    try {
      let response;
      
      if (editingSubject) {
        response = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
      } else {
        response = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
      }
      
      if (response.ok) {
        setMessage({ 
          text: editingSubject ? "Subject updated successfully!" : "Subject added successfully!", 
          type: "success" 
        });
        setFormData({ code: "", name: "", credits: 3, semester: 1, department: "BCA" });
        setEditingSubject(null);
        fetchSubjects();
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      } else {
        const data = await response.json();
        setMessage({ text: data.error || "Failed to save subject", type: "error" });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      }
    } catch (error) {
      console.error("Error saving subject:", error);
      setMessage({ text: "Failed to save subject", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      code: subject.code,
      name: subject.name,
      credits: subject.credits,
      semester: subject.semester,
      department: subject.department
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSubject(null);
    setFormData({ code: "", name: "", credits: 3, semester: 1, department: "BCA" });
  };

  const handleDelete = async (subjectId: string) => {
    try {
      console.log("Attempting to delete subject:", subjectId);
      
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Delete response status:", response.status);
      
      let data;
      try {
        data = await response.json();
        console.log("Delete response data:", data);
      } catch (e) {
        console.error("Could not parse response JSON:", e);
        data = { error: "Server returned an invalid response" };
      }

      if (response.ok) {
        setMessage({ text: "Subject deleted successfully!", type: "success" });
        fetchSubjects();
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      } else {
        console.error("Delete failed:", data);
        setMessage({ text: data.error || "Failed to delete subject", type: "error" });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
      }
    } catch (error) {
      console.error("Error in delete function:", error);
      setMessage({ text: "Error deleting subject: " + (error instanceof Error ? error.message : "Unknown error"), type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading subjects...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Subject Management</h1>
      
      {/* Message Display */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Add/Edit Subject Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">
          {editingSubject ? "Edit Subject" : "Add New Subject"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Subject Code (e.g., BCA301)"
            value={formData.code}
            onChange={(e) => setFormData({...formData, code: e.target.value})}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Subject Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="number"
            placeholder="Credits"
            value={formData.credits.toString()}
            onChange={(e) => setFormData({...formData, credits: parseInt(e.target.value) || 1})}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min="1"
            max="10"
          />
          <input
            type="number"
            placeholder="Semester"
            value={formData.semester.toString()}
            onChange={(e) => setFormData({...formData, semester: parseInt(e.target.value) || 1})}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min="1"
            max="8"
          />
          <select
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BCA">BCA</option>
            <option value="BBA">BBA</option>
            <option value="CS">Computer Science</option>
            <option value="IT">Information Technology</option>
          </select>
          <div className="flex space-x-2">
            <button 
              type="submit" 
              className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            >
              {editingSubject ? "Update Subject" : "Add Subject"}
            </button>
            {editingSubject && (
              <button 
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Subjects List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No subjects added yet. Add your first subject above.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Code</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Name</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Credits</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Semester</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Department</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-700">{subject.code}</td>
                  <td className="p-3 text-sm text-gray-700">{subject.name}</td>
                  <td className="p-3 text-sm text-gray-700">{subject.credits}</td>
                  <td className="p-3 text-sm text-gray-700">{subject.semester}</td>
                  <td className="p-3 text-sm text-gray-700">{subject.department}</td>
                  <td className="p-3 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(subject)}
                        className="text-blue-600 hover:text-blue-800 transition p-1"
                        title="Edit Subject"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(subject.id)}
                        className="text-red-600 hover:text-red-800 transition p-1"
                        title="Delete Subject"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
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
              Are you sure you want to delete this subject? This will also remove all enrollments and attendance records for this subject. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Info */}
      <div className="mt-4 p-2 bg-gray-100 text-xs">
        <p>Total subjects: {subjects.length}</p>
      </div>
    </div>
  );
}