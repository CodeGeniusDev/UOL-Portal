/**
 * BACKEND MODULE: Knowledge Base Management
 * -----------------------------------------
 * Handles all file-system operations for the UOL knowledge base.
 * Provides helpers to read, append, and list knowledge base content.
 * This is a server-side only module (uses fs).
 */

import fs from "fs";
import path from "path";

const KB_DIR = path.join(process.cwd(), "knowledge_base");
const KB_FILE = path.join(KB_DIR, "uol_knowledge_base.md");

/**
 * Read the full knowledge base markdown file.
 */
export function getKnowledgeBase(): string {
  try {
    if (!fs.existsSync(KB_FILE)) return "";
    return fs.readFileSync(KB_FILE, "utf-8");
  } catch {
    console.warn("[KB] Could not read knowledge base file.");
    return "";
  }
}

/**
 * Append a new section (e.g., uploaded document content) to the knowledge base.
 */
export function appendToKnowledgeBase(
  sectionTitle: string,
  content: string,
  filename: string,
  department: string
): void {
  if (!fs.existsSync(KB_DIR)) {
    fs.mkdirSync(KB_DIR, { recursive: true });
  }

  const timestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const entry = [
    `\n\n---\n`,
    `## ${sectionTitle} — ${department}`,
    `**File**: ${filename} | **Added**: ${timestamp}\n`,
    content.trim().substring(0, 6000), // cap at 6000 chars per file
    `\n`,
  ].join("\n");

  fs.appendFileSync(KB_FILE, entry, "utf-8");
  console.log(`[KB] Appended "${sectionTitle}" from ${filename} to knowledge base.`);
}

/**
 * List all uploaded files in the knowledge_base directory (excluding the KB markdown itself).
 */
export interface UploadedFile {
  name: string;
  originalName: string;
  sizeKB: number;
  date: string;
  type: string;
}

export function listUploadedFiles(): UploadedFile[] {
  try {
    if (!fs.existsSync(KB_DIR)) return [];

    return fs
      .readdirSync(KB_DIR)
      .filter((f) => f !== "uol_knowledge_base.md" && /\.(pdf|txt)$/i.test(f))
      .map((f) => {
        const stat = fs.statSync(path.join(KB_DIR, f));
        // filename format: <timestamp>_<type>_<originalname>
        const parts = f.replace(/^\d+_/, "").split("_");
        const type = parts[0] || "resource";
        const originalName = parts.slice(1).join("_") || f;
        return {
          name: f,
          originalName: originalName,
          sizeKB: Math.round(stat.size / 1024),
          date: stat.mtime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          type,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}
