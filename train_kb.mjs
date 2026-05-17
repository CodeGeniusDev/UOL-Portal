/**
 * TRAINING SCRIPT: Process all PDFs in knowledge_base/ and add to KB markdown
 * Run with:  node train_kb.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KB_DIR = path.join(__dirname, "knowledge_base");
const KB_FILE = path.join(KB_DIR, "uol_knowledge_base.md");

async function parsePDF(filePath) {
  if (filePath.endsWith('.txt')) {
    return fs.readFileSync(filePath, "utf-8");
  }
  // pdf-parse exports differently depending on version
  let pdfParseMod = require("pdf-parse");
  const pdfParse = typeof pdfParseMod === 'function' ? pdfParseMod : (pdfParseMod.default || pdfParseMod.parse);
  if (typeof pdfParse !== 'function') throw new Error('pdf-parse module not callable');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || "";
}

async function main() {
  console.log("🎓 UOL Knowledge Base Training Script");
  console.log("======================================\n");

  if (!fs.existsSync(KB_DIR)) {
    console.log("❌ knowledge_base/ directory not found.");
    process.exit(1);
  }

  // Read existing KB to skip already-indexed files
  const existingKB = fs.existsSync(KB_FILE) ? fs.readFileSync(KB_FILE, "utf-8") : "";

  const files = fs.readdirSync(KB_DIR).filter((f) => f.endsWith(".pdf") || f.endsWith(".txt"));

  if (files.length === 0) {
    console.log("ℹ️  No PDF or TXT files found in knowledge_base/. Nothing to process.\n");
    return;
  }

  console.log(`📂 Found ${files.length} file(s):\n`);
  files.forEach((f) => console.log(`   • ${f}`));
  console.log();

  let processed = 0;

  for (const file of files) {
    const filePath = path.join(KB_DIR, file);

    // Skip if already indexed
    if (existingKB.includes(`**File**: ${file}`)) {
      console.log(`⏭️  Skipping "${file}" — already in knowledge base.\n`);
      continue;
    }

    console.log(`📄 Processing: ${file}`);

    try {
      const text = await parsePDF(filePath);

      if (!text || text.trim().length < 20) {
        console.log(`   ⚠️  No extractable text (scanned/image PDF). Skipping.\n`);
        continue;
      }

      // Determine section title from filename
      const nameLower = file.toLowerCase();
      let sectionTitle = "Uploaded Resource";
      if (nameLower.includes("timetable") || nameLower.includes("schedule") || nameLower.includes("timtable")) {
        sectionTitle = "Class Schedule / Timetable";
      } else if (nameLower.includes("datesheet")) {
        sectionTitle = "Exam Date Sheet";
      } else if (nameLower.includes("faculty")) {
        sectionTitle = "Faculty List";
      }

      // Detect department from filename
      let department = "General";
      if (nameLower.includes("bsai") || nameLower.includes("_ai_")) {
        department = "Department of Artificial Intelligence (BSAI)";
      } else if (nameLower.includes("bscs") || nameLower.includes("_cs_")) {
        department = "Department of Computer Science";
      } else if (nameLower.includes("bsse") || nameLower.includes("_se_")) {
        department = "Department of Software Engineering";
      }

      const timestamp = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });

      const trimmedText = text.trim().substring(0, 8000);
      const entry = `\n\n---\n\n## ${sectionTitle} — ${department}\n**File**: ${file} | **Added**: ${timestamp}\n\n${trimmedText}\n`;

      fs.appendFileSync(KB_FILE, entry, "utf-8");

      console.log(`   ✅ Added to KB (${trimmedText.length.toLocaleString()} chars extracted).\n`);
      processed++;
    } catch (error) {
      console.error(`   ❌ Error processing "${file}":`, error.message, "\n");
    }
  }

  console.log("======================================");
  if (processed > 0) {
    console.log(`\n✅ Done! ${processed} file(s) added to the knowledge base.`);
    console.log(`📍 KB file: ${KB_FILE}\n`);
  } else {
    console.log(`\nℹ️  No new files added (all already indexed or had no text).\n`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
