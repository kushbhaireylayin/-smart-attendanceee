"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SickLeave {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  documentUrl?: string;
  status: string;
  createdAt: string;
  student: {
    name: string;
    email: string;
    rollNumber: string | null;
    department: string | null;
    semester: number | null;
  };
}

export default function AdminSickLeavePage() {
  const [leaves, setLeaves] = useState<SickLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "" });
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    const params = new URLSearchParams();
    if (filter.status) params.append("status", filter.status);

    const res = await fetch(`/api/sick-leave?${params.toString()}`);
    const data = await res.json();
    setLeaves(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/sick-leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      setMessage({ text: `Leave ${status.toLowerCase()} successfully!`, type: "success" });
      fetchLeaves();
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } else {
      setMessage({ text: "Failed to update status", type: "error" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }
  };

  const calculateDays = (from: string, to: string) => {
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Calculate total sick days per student
  const totalPerStudent = leaves.reduce((acc, leave) => {
    if (leave.status === "APPROVED") {
      const studentName = leave.student.name;
      if (!acc[studentName]) acc[studentName] = 0;
      const days = calculateDays(leave.fromDate, leave.toDate);
      acc[studentName] += days;
    }
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading sick leaves...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Manage Sick Leaves</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Message Display */}
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {message.text}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500">Total Applications</p>
            <p className="text-3xl font-bold text-gray-800">{leaves.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {leaves.filter(l => l.status === "PENDING").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-3xl font-bold text-green-600">
              {leaves.filter(l => l.status === "APPROVED").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-3xl font-bold text-red-600">
              {leaves.filter(l => l.status === "REJECTED").length}
            </p>
          </div>
        </div>

        {/* Total Sick Days per Student */}
        {Object.keys(totalPerStudent).length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            <h2 className="text-lg font-semibold mb-4">Total Sick Days per Student (Approved Only)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(totalPerStudent).map(([name, days]) => (
                <div key={name} className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-800">{name}</p>
                  <p className="text-2xl font-bold text-blue-600">{days}</p>
                  <p className="text-sm text-gray-500">total days</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ status: e.target.value })}
                className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <button
              onClick={fetchLeaves}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Leaves Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <h2 className="text-lg font-semibold p-6 border-b">All Sick Leave Applications</h2>
          
          {leaves.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No sick leave applications found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Student</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Roll No</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">From</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">To</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Days</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Reason</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Document</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        <div className="font-medium">{leave.student.name}</div>
                        <div className="text-xs text-gray-500">{leave.student.email}</div>
                      </td>
                      <td className="p-3 text-sm">{leave.student.rollNumber || "N/A"}</td>
                      <td className="p-3 text-sm">{new Date(leave.fromDate).toLocaleDateString()}</td>
                      <td className="p-3 text-sm">{new Date(leave.toDate).toLocaleDateString()}</td>
                      <td className="p-3 text-sm font-medium">{calculateDays(leave.fromDate, leave.toDate)}</td>
                      <td className="p-3 text-sm max-w-xs truncate">{leave.reason}</td>
                      <td className="p-3 text-sm">
                        {leave.documentUrl ? (
                          <a 
                            href={leave.documentUrl} 
                            target="_blank" 
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          leave.status === "APPROVED" ? "bg-green-100 text-green-700" :
                          leave.status === "REJECTED" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        {leave.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(leave.id, "APPROVED")}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateStatus(leave.id, "REJECTED")}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}