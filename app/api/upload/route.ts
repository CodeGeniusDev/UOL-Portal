/**
 * API ROUTE: /api/upload
 * ----------------------
 * Handles file uploads for both Admin and Student dashboards.
 *
 * POST — Upload a PDF/TXT file, parse it, and append content to the knowledge base.
 * GET  — Return list of all uploaded files for the Admin dashboard.
 *
 * This route is fully FILE-BASED (no database required). It saves the uploaded
 * file to /knowledge_base/, parses the text, and appends a section to
 * uol_knowledge_base.md — which the chat AI reads on every request.
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { appendToKnowledgeBase, listUploadedFiles } from "@/backend/knowledge";

export const dynamic = "force-dynamic";

// ─── Parse PDF using pdf-parse (server-side only) ────────────────────────────
async function parsePDF(filePath: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("[Upload] PDF parse error:", error);
    return "";
  }
}

// ─── POST: Upload a file ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const departmentId = (formData.get("departmentId") as string) || "general";
    const type = (formData.get("type") as string) || "resource";

    // ── Validation ──────────────────────────────────────────────────────────
    if (!file) {
      return NextResponse.json(
        { error: "No file received. Please select a file before uploading." },
        { status: 400 }
      );
    }

    const allowedTypes = [".pdf", ".txt"];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: "Only PDF and TXT files are supported." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum allowed size is 20 MB." },
        { status: 400 }
      );
    }

    // ── Save file to /knowledge_base/ ───────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFilename = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    // Add timestamp + type prefix so we can list them with metadata
    const storedFilename = `${Date.now()}_${type}_${safeFilename}`;
    const UPLOAD_DIR = path.join(process.cwd(), "knowledge_base");

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const filePath = path.join(UPLOAD_DIR, storedFilename);
    await writeFile(filePath, buffer);
    console.log(`[Upload] File saved: ${filePath}`);

    // ── Parse text content ──────────────────────────────────────────────────
    let textContent = "";
    if (ext === ".pdf") {
      textContent = await parsePDF(filePath);
    } else if (ext === ".txt") {
      textContent = buffer.toString("utf-8");
    }

    // ── Append to knowledge base ────────────────────────────────────────────
    if (textContent.trim().length > 10) {
      const sectionTitle =
        type === "schedule"
          ? "Class Schedule / Timetable"
          : type === "datesheet"
          ? "Exam Date Sheet"
          : type === "faculty"
          ? "Faculty List"
          : "Uploaded Resource";

      appendToKnowledgeBase(sectionTitle, textContent, file.name, departmentId);

      return NextResponse.json({
        success: true,
        message: `✅ "${file.name}" uploaded and added to the AI knowledge base successfully!`,
        filename: storedFilename,
        chunks: textContent.length,
      });
    } else {
      // File saved but could not extract text (blank PDF, scanned image, etc.)
      return NextResponse.json({
        success: true,
        message: `✅ File "${file.name}" saved. Note: Text could not be extracted (may be a scanned image PDF). The file is stored but not indexed.`,
        filename: storedFilename,
        chunks: 0,
      });
    }
  } catch (error) {
    console.error("[Upload] Unexpected error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Upload failed: ${msg}` },
      { status: 500 }
    );
  }
}

// ─── GET: List uploaded files (for Admin Dashboard) ──────────────────────────
export async function GET() {
  try {
    const files = listUploadedFiles();
    return NextResponse.json({ files });
  } catch (error) {
    console.error("[Upload] GET error:", error);
    return NextResponse.json({ files: [] });
  }
}
