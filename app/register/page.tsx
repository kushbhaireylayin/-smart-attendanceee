"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WebcamCapture from "@/components/WebcamCapture";
import { descriptorToArray } from "@/lib/face-recognition/faceApi";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT",
    rollNumber: "",
    semester: "1",
    department: "BCA"
  });
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFaceDetected = (descriptor: Float32Array, imageSrc: string) => {
    setFaceDescriptor(descriptor);
    setFaceImage(imageSrc);
    setError("");
  };

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email");
      return false;
    }
    // Validate university fields for students only
    if (formData.role === "STUDENT") {
      if (!formData.rollNumber) {
        setError("University Register Number is required");
        return false;
      }
      if (!formData.semester) {
        setError("Semester is required");
        return false;
      }
      if (!formData.department) {
        setError("Department is required");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      // If role is ADMIN, skip to submission directly (no face capture)
      if (formData.role === "ADMIN") {
        handleSubmit();
      } else {
        setStep(2);
      }
      setError("");
    }
  };

  const handleSubmit = async () => {
    // For non-admin users, face descriptor is required
    if (formData.role !== "ADMIN" && !faceDescriptor) {
      setError("Please capture your face");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Prepare data for API
      const requestData: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      // Add student-specific fields
      if (formData.role === "STUDENT") {
        requestData.rollNumber = formData.rollNumber;
        requestData.semester = parseInt(formData.semester);
        requestData.department = formData.department;
      }

      // Add face data for non-admin users
      if (formData.role !== "ADMIN" && faceDescriptor) {
        requestData.faceDescriptor = descriptorToArray(faceDescriptor);
        requestData.faceImage = faceImage;
      }

      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determine if we should show the progress bar (hide for admin direct submission)
  const showProgress = step === 1 || (step === 2 && formData.role !== "ADMIN");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Registration</h1>
            <p className="text-gray-600 mt-2">
              {formData.role === "ADMIN" 
                ? "Register as Administrator" 
                : "Register with your details and face"}
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Progress Steps - Only show for non-admin or step 1 */}
          {showProgress && (
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center w-full max-w-md">
                <div className={`flex-1 h-1 ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <div className={`flex-1 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* University Fields - Only for Students */}
              {formData.role === "STUDENT" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      University Register Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="rollNumber"
                      value={formData.rollNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., BCA2025001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Semester <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Semester</option>
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                      <option value="7">Semester 7</option>
                      <option value="8">Semester 8</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="BCA">BCA - Bachelor of Computer Applications</option>
                      <option value="BBA">BBA - Bachelor of Business Administration</option>
                      <option value="CS">CS - Computer Science</option>
                      <option value="IT">IT - Information Technology</option>
                    </select>
                  </div>
                </>
              )}

              {/* Password Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Register as
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <button
                onClick={handleNextStep}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {loading 
                  ? "Registering..." 
                  : formData.role === "ADMIN" 
                    ? "Complete Registration" 
                    : "Next: Capture Face"}
              </button>
            </div>
          )}

          {step === 2 && formData.role !== "ADMIN" && (
            <div className="space-y-6">
              <WebcamCapture
                onFaceDetected={handleFaceDetected}
                onError={setError}
              />

              {faceDescriptor && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm text-center">
                    ✓ Face captured successfully! You can now complete registration.
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition font-medium"
                >
                  Back
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={loading || !faceDescriptor}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}