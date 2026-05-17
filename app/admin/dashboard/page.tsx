/**
 * FRONTEND PAGE: Admin Dashboard
 * --------------------------------
 * Allows admins to upload departmental resources (PDFs/TXTs).
 * Uploaded files are parsed and automatically added to the AI knowledge base.
 * Shows live list of all uploaded files fetched from /api/upload (GET).
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  LogOut,
  Loader2,
} from "lucide-react";
import { UOL_DEPARTMENTS } from "@/backend/departments";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UploadedFile {
  name: string;
  originalName: string;
  sizeKB: number;
  date: string;
  type: string;
}

interface UploadStatus {
  type: "success" | "error" | "loading";
  message: string;
}

const FILE_TYPES = [
  { value: "schedule", label: "📅 Class Schedule / Timetable" },
  { value: "datesheet", label: "📋 Exam Date Sheet" },
  { value: "faculty", label: "👨‍🏫 Faculty List" },
  { value: "resource", label: "📄 General Resource" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDept, setSelectedDept] = useState(UOL_DEPARTMENTS[0]);
  const [selectedType, setSelectedType] = useState("schedule");
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── Load uploaded files on mount and after upload ─────────────────────────
  const fetchUploadedFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/upload");
      const data = await res.json();
      setUploadedFiles(data.files || []);
    } catch {
      setUploadedFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setStatus(null);
  };

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: "error", message: "Please select a file first." });
      return;
    }

    setUploading(true);
    setStatus({ type: "loading", message: "Uploading and indexing file…" });

    const formData = new FormData();
    const deptId = selectedDept.replace(/\s+/g, "-").toLowerCase();
    formData.append("file", file);
    formData.append("departmentId", deptId);
    formData.append("type", selectedType);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({ type: "success", message: data.message });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Refresh the file list
        await fetchUploadedFiles();
      } else {
        setStatus({
          type: "error",
          message: data.error || "Upload failed. Please try again.",
        });
      }
    } catch {
      setStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith(".pdf") || dropped.name.endsWith(".txt"))) {
      setFile(dropped);
      setStatus(null);
    } else {
      setStatus({ type: "error", message: "Only PDF and TXT files are supported." });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-slate-50 to-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-700 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Upload resources to train the AI knowledge base</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:border-red-200"
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </header>

        {/* ── Upload Card ── */}
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-700 to-green-600 text-white pb-6">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Upload className="h-5 w-5" />
              Upload New Resource to AI Knowledge Base
            </CardTitle>
            <CardDescription className="text-green-100">
              Upload PDFs or TXT files. Content will be automatically parsed and added to the AI.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Department */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Department</label>
                <select
                  className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  {UOL_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Resource Type</label>
                <select
                  className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  {FILE_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>
                      {ft.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                file
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50"
              }`}
            >
              <Input
                ref={fileInputRef}
                id="admin-file-upload"
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload
                className={`mx-auto mb-3 h-10 w-10 ${file ? "text-green-600" : "text-gray-300"}`}
              />
              {file ? (
                <div>
                  <p className="font-bold text-green-700 text-sm">{file.name}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {(file.size / 1024).toFixed(1)} KB · Ready to upload
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-gray-500 text-sm">
                    Drag & drop a file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF or TXT · Max 20 MB</p>
                </div>
              )}
            </div>

            {/* Status message */}
            {status && status.type !== "loading" && (
              <div
                className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
                  status.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            {/* Upload button */}
            <Button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="w-full h-12 bg-green-700 hover:bg-green-800 rounded-xl text-base font-bold shadow-lg shadow-green-200 transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading & Indexing…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Upload to AI Knowledge Base
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Uploaded Files List ── */}
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Uploaded Resources</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? "s" : ""} in knowledge base
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchUploadedFiles}
              disabled={loadingFiles}
              className="text-gray-500 hover:text-green-700"
            >
              <RefreshCw className={`h-4 w-4 ${loadingFiles ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            {loadingFiles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : uploadedFiles.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-30" />
                <p className="font-medium">No files uploaded yet.</p>
                <p className="text-sm mt-1">Upload your first resource above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-green-200 hover:bg-green-50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {f.originalName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {f.sizeKB} KB · {f.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-semibold ${
                          f.type === "schedule"
                            ? "bg-blue-100 text-blue-700"
                            : f.type === "datesheet"
                            ? "bg-orange-100 text-orange-700"
                            : f.type === "faculty"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {f.type}
                      </span>
                      <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">
                        ✓ Indexed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
