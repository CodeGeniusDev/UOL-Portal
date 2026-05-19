// import 'server-only';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/database/client";
import fs from "fs";


// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Mock mode if GEMINI_API_KEY is missing
const isMockMode = !process.env.GEMINI_API_KEY;

/**
 * Parse a PDF file and return text
 */
export async function parsePDF(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer); 
  return data.text;
}

/**
 * Generate embedding from text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (isMockMode) {
    console.warn("Using mock embedding (random) - Set GEMINI_API_KEY to fix.");
    return Array(768).fill(0).map(() => Math.random());
  }

  const model = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Process document and save text chunks + embeddings to DB
 */
// Helper to compute cosine similarity in JS to bypass PgLite WASM crash
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function processDocument(filePath: string, documentId: string) {
  console.log(`Processing document: ${filePath}`);

  let text = "";

  if (filePath.endsWith(".pdf")) {
    text = await parsePDF(filePath); // ✅ PDF parsed correctly
  } else {
    text = fs.readFileSync(filePath, "utf-8"); // text file fallback
  }

  // Chunk text: split by double newlines or max 1000 chars
  const chunks = text
    .split(/\n\n+/)
    .flatMap(chunk => {
      if (chunk.length > 1000) {
        return chunk.match(/.{1,1000}/g) || [];
      }
      return chunk;
    })
    .filter(c => c.trim().length > 20);

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    const vectorString = `[${embedding.join(",")}]`;

    // Save chunk + embedding to DB
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeBase" ("id", "documentId", "textChunk", "vectorEmbedding", "createdAt")
      VALUES (gen_random_uuid(), ${documentId}, ${chunk}, ${vectorString}::vector, NOW());
    `;
  }

  console.log(`Processed ${chunks.length} chunks for document ${documentId}`);
}

/**
 * Query knowledge base using vector similarity
 */
export async function queryKnowledgeBase(query: string, departmentId?: string) {
  const embedding = await generateEmbedding(query);
  // 3. Fallback: JS-bsaed Cosine Similarity Search
  // Fetch all chunks for this department to calculate distance in Node.js
  let knowledgeBaseEntries: any[] = [];
  try {
      knowledgeBaseEntries = await prisma.knowledgeBase.findMany({
        include: {
          document: true
        },
        where: {
          document: {
            departmentId: departmentId,
          }
        }
      });
  } catch (error) {
      console.warn("Database connection failed, relying on primary knowledge base markdown.");
      return [];
  }

  const parsedEmbedding = embedding;

  const results = knowledgeBaseEntries.map((entry: any) => {
    // Determine vector representation
    let vec: number[] = [];
    if (Array.isArray(entry.vectorEmbedding)) {
      vec = entry.vectorEmbedding as number[];
    } else if (typeof entry.vectorEmbedding === 'string') {
      try {
        const cleaned = (entry.vectorEmbedding as string).replace(/^\[|\]$/g, '');
        vec = cleaned.split(',').map(Number);
      } catch (e) {
        vec = [];
      }
    }

    // Fallback safe vector length check
    if (vec.length !== parsedEmbedding.length) {
      return { ...entry, similarity: 0 };
    }

    const similarity = cosineSimilarity(parsedEmbedding, vec);
    return {
      textChunk: entry.textChunk,
      documentId: entry.documentId,
      similarity: similarity
    };
  });

  // Sort by highest similarity
  results.sort((a: any, b: any) => b.similarity - a.similarity);

  // Take top 5
  return results.slice(0, 5);
}
