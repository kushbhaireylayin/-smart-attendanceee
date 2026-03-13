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
}

export default function StudentSickLeavePage() {
  const [leaves, setLeaves] = useState<SickLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [document, setDocument] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/sick-leave/student");
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ text: "File too large. Maximum size is 5MB.", type: "error" });
        return;
      }
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setMessage({ text: "Invalid file type. Please upload JPG, PNG, GIF, or PDF.", type: "error" });
        return;
      }
      setDocument(file);
      setMessage({ text: "", type: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: "", type: "" });

    try {
      // Validate dates
      if (new Date(form.fromDate) > new Date(form.toDate)) {
        setMessage({ text: "From date cannot be after to date", type: "error" });
        setSubmitting(false);
        return;
      }

      // Convert file to base64 if selected
      let documentBase64 = "";
      if (document) {
        try {
          console.log('Processing file:', document.name, 'Size:', document.size, 'Type:', document.type);
          
          documentBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              console.log('File converted to base64 successfully');
              resolve(reader.result as string);
            };
            reader.onerror = (error) => {
              console.error('FileReader error:', error);
              reject(error);
            };
            reader.readAsDataURL(document);
          });
        } catch (fileError) {
          console.error('File conversion error:', fileError);
          setMessage({ text: "Error processing file. Please try again.", type: "error" });
          setSubmitting(false);
          return;
        }
      }

      console.log('Submitting form with data:', {
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason,
        hasDocument: !!documentBase64
      });

      const res = await fetch("/api/sick-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: form.fromDate,
          toDate: form.toDate,
          reason: form.reason,
          document: documentBase64,
        }),
      });

      const data = await res.json();
      console.log('Server response:', data);

      if (res.ok) {
        setMessage({ text: "Sick leave submitted successfully!", type: "success" });
        setForm({ fromDate: "", toDate: "", reason: "" });
        setDocument(null);
        fetchLeaves();
        
        // Reset file input - FIXED VERSION
        try {
          const fileInput = document.getElementById("file-upload") as HTMLInputElement;
          if (fileInput) fileInput.value = "";
        } catch (err) {
          console.log('Could not reset file input:', err);
        }
      } else {
        setMessage({ text: data.error || "Submission failed", type: "error" });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setMessage({ text: "Error submitting application. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDays = (from: string, to: string) => {
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading...</p>
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
            <h1 className="text-2xl font-bold text-gray-800">Sick Leave Applications</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Submission Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-semibold mb-6">Apply for Sick Leave</h2>
          
          {message.text && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fromDate}
                  onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.toDate}
                  onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Please describe your reason for leave..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supporting Document (Optional)
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.pdf"
                onChange={handleFileChange}
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: JPG, PNG, GIF, PDF (Max 5MB)
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-6">Your Leave History</h2>
          
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No leave applications yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">From</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">To</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Days</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Reason</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="p-3 text-left text-sm font-medium text-gray-600">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        {new Date(leave.fromDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(leave.toDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm font-medium">
                        {calculateDays(leave.fromDate, leave.toDate)}
                      </td>
                      <td className="p-3 text-sm max-w-xs truncate">
                        {leave.reason}
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