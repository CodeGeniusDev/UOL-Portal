import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { queryKnowledgeBase } from "@/backend/rag";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// ======================
// API KEY VALIDATION
// ======================

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("❌ GEMINI_API_KEY is missing in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// ======================
// LOAD KNOWLEDGE BASE
// ======================

let UOL_KNOWLEDGE = "";

try {
  const kbPath = path.join(
    process.cwd(),
    "knowledge_base",
    "uol_knowledge_base.md",
  );

  UOL_KNOWLEDGE = fs.readFileSync(kbPath, "utf-8");
} catch (error) {
  console.warn("⚠️ Knowledge base file not found, using fallback knowledge.");

  UOL_KNOWLEDGE = `
THE UNIVERSITY OF LAHORE (UOL) — VERIFIED FACTS

HOD Artificial Intelligence: Dr. Hisham Khalil
HOD Computer Science: Dr. Mehtab Afzal
HOD Software Engineering: Dr. Sundus Shahzeen

Dean of Faculty of IT: Prof. Dr. Ibrar Hussain

Bus Routes:
- Sheikhupura: 6:45 AM
- Kasur: 7:00 AM
- Raiwind: 7:15 AM
- Lahore City: 7:30 AM

Hostels:
- Razia Hall
- Fatima Hall
- Kulsoom Hall
- Shahida Hall

Cafes:
- Gloria Jean's
- Main Café
- Basement Café
- X2 Café

Counseling:
- University Counseling Center (UCC)
- Office of Student Affairs (OSA)
`;
}

// ======================
// POST API
// ======================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { messages, message, departmentId } = body;

    // ======================
    // VALIDATE MESSAGES
    // ======================

    let finalMessages: any[] = [];

    if (messages && Array.isArray(messages) && messages.length > 0) {
      finalMessages = messages;
    } else if (message) {
      finalMessages = [
        {
          role: "user",
          content: message,
        },
      ];
    } else {
      return NextResponse.json(
        {
          error: "Messages array or message is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================
    // LAST USER MESSAGE
    // ======================

    const lastUserMessage =
      finalMessages[finalMessages.length - 1]?.content || "";

    // ======================
    // RAG CONTEXT
    // ======================

    let ragContextText = "";

    try {
      const ragResults = await queryKnowledgeBase(
        lastUserMessage,
        departmentId,
      );

      if (ragResults && ragResults.length > 0) {
        ragContextText = ragResults
          .filter((r: any) => r?.textChunk)
          .map((r: any) => r.textChunk)
          .join("\n\n");
      }
    } catch (error) {
      console.error("❌ RAG Error:", error);
    }

    // ======================
    // SYSTEM PROMPT
    // ======================

    const SYSTEM_PROMPT = `
### ROLE
You are the Official UOL Expert AI Assistant for THE UNIVERSITY OF LAHORE (UOL).

Your job is to provide accurate, professional, and fact-based university information.

========================
CRITICAL RULES
========================

1. ONLY use information from the provided context.
2. NEVER hallucinate facts.
3. NEVER redirect users elsewhere.
4. Use exact HOD names and timings.
5. Help students calmly if stressed.

========================
VERIFIED FACTS
========================

- HOD Artificial Intelligence: Dr. Hisham Khalil
- HOD Computer Science: Dr. Mehtab Afzal
- HOD Software Engineering: Dr. Sundus Shahzeen
- Dean of FIT: Prof. Dr. Ibrar Hussain
- Vice Chancellor: Prof. Dr. Shahid Munir

========================
KNOWLEDGE BASE
========================

${UOL_KNOWLEDGE.slice(0, 12000)}

========================
RELEVANT CONTEXT
========================

${ragContextText || "No additional context found."}

========================
INSTRUCTION
========================

Provide a clear and concise answer.
`;

    console.log(`✅ System Prompt Loaded (${SYSTEM_PROMPT.length} chars)`);

    // ======================
    // GEMINI MODELS
    // ======================

    const modelNames = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
    ];

    let response = "";
    let success = false;
    let lastError: any = null;

    // ======================
    // TRY MODELS
    // ======================

    for (const modelName of modelNames) {
      try {
        console.log(`🚀 Trying model: ${modelName}`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
        });

        // ======================
        // BUILD HISTORY
        // ======================

        let history = finalMessages.slice(0, -1).map((msg: any) => {
          const parts: any[] = [];

          // Handle image
          if (msg.image) {
            const matches = msg.image.match(/^data:(image\/\w+);base64,(.*)$/);

            if (matches) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2],
                },
              });
            }
          }

          // Add text
          parts.push({
            text: msg.content || "",
          });

          return {
            role: msg.role === "assistant" ? "model" : "user",
            parts,
          };
        });

        // Gemini history must start with user
        while (history.length > 0 && history[0].role !== "user") {
          history.shift();
        }

        // ======================
        // START CHAT
        // ======================

        const chat = model.startChat({
          history,
        });

        // ======================
        // LAST MESSAGE
        // ======================

        const lastMessage = finalMessages[finalMessages.length - 1];

        let sendParts: any = lastMessage.content || "";

        // Handle image in last message
        if (lastMessage.image) {
          const matches = lastMessage.image.match(
            /^data:(image\/\w+);base64,(.*)$/,
          );

          if (matches) {
            sendParts = [
              {
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2],
                },
              },
              {
                text: lastMessage.content || "",
              },
            ];
          }
        }

        // ======================
        // SEND MESSAGE
        // ======================

        const result = await chat.sendMessage(sendParts);

        response = result.response.text();

        success = true;

        console.log(`✅ Success with ${modelName}`);

        break;
      } catch (error: any) {
        lastError = error;

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(`❌ Model ${modelName} failed:`, errorMessage);

        // Skip unavailable models
        if (
          errorMessage.includes("404") ||
          errorMessage.includes("not found")
        ) {
          continue;
        }

        // Stop on rate limit
        if (errorMessage.includes("429") || error.status === 429) {
          throw error;
        }
      }
    }

    // ======================
    // ALL MODELS FAILED
    // ======================

    if (!success) {
      throw lastError || new Error("All models failed.");
    }

    // ======================
    // SUCCESS RESPONSE
    // ======================

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error: any) {
    console.error("❌ Chat API Error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // ======================
    // RATE LIMIT ERROR
    // ======================

    if (errorMessage.includes("429") || error?.status === 429) {
      return NextResponse.json(
        {
          success: false,
          response:
            "⚠️ Too many requests right now. Please wait 30 seconds and try again.",
        },
        {
          status: 429,
        },
      );
    }

    // ======================
    // GENERAL ERROR
    // ======================

    return NextResponse.json(
      {
        success: false,
        response: `⚠️ Chat Error: ${errorMessage}`,
      },
      {
        status: 500,
      },
    );
  }
}
