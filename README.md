# 🎓 Smart Attendance System with Face Recognition

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.22-green)
![License](https://img.shields.io/badge/license-MIT-orange)

A modern, full-stack attendance management system that uses **face recognition** to automatically mark student attendance. Built with Next.js 14, TypeScript, Prisma, and face-api.js.

![Dashboard Preview](./screenshots/dashboard.png)

## ✨ Features

### 👥 Multi-Role Authentication
- **Admin**: Full system control, manage subjects/teachers/students, view analytics
- **Teacher**: View assigned subjects, mark attendance, track class
- **Student**: Register with face, mark attendance, view progress

### 📸 Face Recognition
- Real-time face detection using face-api.js
- 128-point face descriptor for accurate matching
- Auto-enrollment on first attendance
- Manual attendance option as backup

### 📊 Academic Management
- Subject management with semester tracking
- Teacher assignment to subjects
- Student enrollment in subjects
- Period-wise attendance (1-8 periods)

### 📈 Analytics & Reports
- Student-wise attendance percentages
- Subject-wise analysis
- Downloadable CSV reports
- Visual charts with Recharts

### 🏥 Sick Leave Management
- Students can apply for medical leave
- Upload supporting documents (JPG, PNG, GIF, PDF)
- Admin approval/rejection workflow
- Track total sick days per student

### 🎨 Modern UI/UX
- Glass-morphism design
- Fully responsive
- Dark/light mode support
- Smooth animations with Framer Motion

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Heroicons |
| **Backend** | Next.js API Routes, NextAuth.js |
| **Database** | SQLite, Prisma ORM |
| **ML/AI** | face-api.js, TensorFlow.js |
| **Charts** | Recharts |
| **File Upload** | Base64, FileReader API |
| **Dev Tools** | VS Code, Git, Prisma Studio |

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Webcam (for face recognition)
- Git

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/smart-attendance.git
cd smart-attendance