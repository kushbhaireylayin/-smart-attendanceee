"use client";

import { useState, useEffect } from "react";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  department: string;
}

interface Teaching {
  id: string;
  teacherId: string;
  subjectId: string;
  academicYear: string;
  teacher: Teacher;
  subject: Subject;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Teaching[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch teachers (users with role TEACHER)
      const teachersRes = await fetch("/api/users?role=TEACHER");
      const teachersData = await teachersRes.json();
      setTeachers(Array.isArray(teachersData) ? teachersData : []);

      // Fetch all subjects
      const subjectsRes = await fetch("/api/subjects");
      const subjectsData = await subjectsRes.json();
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);

      // Fetch existing assignments
      const assignmentsRes = await fetch("/api/teachings");
      const assignmentsData = await assignmentsRes.json();
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ text: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!selectedTeacher || !selectedSubject) {
      setMessage({ text: "Please select both teacher and subject", type: "error" });
      return;
    }

    try {
      const response = await fetch("/api/teachings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          subjectId: selectedSubject,
          academicYear
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: "Subject assigned successfully!", type: "success" });
        setSelectedTeacher("");
        setSelectedSubject("");
        // Refresh assignments
        const assignmentsRes = await fetch("/api/teachings");
        const assignmentsData = await assignmentsRes.json();
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      } else {
        setMessage({ text: data.error || "Failed to assign subject", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Error assigning subject", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Teacher Subject Assignment</h1>

      {/* Message Display */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Assignment Form */}
      <form onSubmit={handleAssign} className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Assign Subject to Teacher</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a teacher...</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.email})
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
              <option value="2023-2024">2023-2024</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            >
              Assign Subject
            </button>
          </div>
        </div>
      </form>

      {/* Current Assignments */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b">Current Assignments</h2>
        {assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No subjects assigned yet. Use the form above to assign subjects to teachers.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Teacher</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Subject</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Code</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Semester</th>
                <th className="p-3 text-left text-sm font-medium text-gray-600">Academic Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm">{assignment.teacher?.name || "Unknown"}</td>
                  <td className="p-3 text-sm">{assignment.subject?.name || "Unknown"}</td>
                  <td className="p-3 text-sm">{assignment.subject?.code || "N/A"}</td>
                  <td className="p-3 text-sm">{assignment.subject?.semester || "N/A"}</td>
                  <td className="p-3 text-sm">{assignment.academicYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-4 p-2 bg-gray-100 text-xs">
        <p>Teachers loaded: {teachers.length}</p>
        <p>Subjects loaded: {subjects.length}</p>
        <p>Assignments: {assignments.length}</p>
      </div>
    </div>
  );
}