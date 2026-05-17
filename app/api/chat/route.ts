import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { queryKnowledgeBase } from "@/backend/rag";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
export const dynamic = 'force-dynamic';

// Load the knowledge base once at module level
let UOL_KNOWLEDGE = "";
try {
  const kbPath = path.join(process.cwd(), "knowledge_base", "uol_knowledge_base.md");
  UOL_KNOWLEDGE = fs.readFileSync(kbPath, "utf-8");
} catch {
  console.warn("⚠️ Knowledge base file not found, using inline fallback.");
  UOL_KNOWLEDGE = `
    THE UNIVERSITY OF LAHORE (UOL) — Key Facts:
    - HOD Artificial Intelligence: Dr. Hisham Khalil
    - HOD Computer Science: Dr. Mehtab Afzal
    - HOD Software Engineering: Dr. Sundus Shahzeen
    - Dean of Faculty of IT: Prof. Dr. Ibrar Hussain
    - Bus routes: Sheikhupura (6:45 AM), Kasur (7:00 AM), Raiwind (7:15 AM), Lahore City (7:30 AM)
    - Hostels: Razia Hall, Fatima Hall (on-campus); Kulsoom Hall, Shahida Hall (off-campus)
    - Cafes: Gloria Jean's, Main Café, Basement Café, X2 Café
    - Counseling: University Counseling Center (UCC), Office of Student Affairs (OSA)
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, departmentId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      // Fallback for old message format if any
      const { message } = body;
      if (!message) {
         return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
      }
      messages.push({ role: 'user', content: message });
    }

    const lastUserMessage = messages[messages.length - 1].content;
    
    // RAG Context retrieval
    let ragContextText = "";
    try {
        const ragResults = await queryKnowledgeBase(lastUserMessage, departmentId);
        if (ragResults && ragResults.length > 0) {
            ragContextText = ragResults.map(r => r.textChunk).join("\\n\\n");
        }
    } catch (e) {
        console.error("RAG error:", e);
    }

const SYSTEM_PROMPT = `### ROLE
You are the **Official UOL Expert AI Assistant** for **THE UNIVERSITY OF LAHORE (UOL)**. Your purpose is to provide 100% accurate, authoritative, and fact-based information to students and staff.

### 🛑 CRITICAL RULES - ZERO TOLERANCE
1. **STRICT CONTEXT ADHERENCE:** Use ONLY the information provided in the <KNOWLEDGE_BASE> and <RELEVANT_CONTEXT> tags below. If a fact (like an HOD name or class time) exists in the context, you MUST use it, even if your internal training data suggests otherwise.
2. **NO HALLUCINATIONS:** If asked about something not in the context, politely state that you are an official UOL assistant and only have information on university-related matters provided in your database.
3. **NO REDIRECTS:** Never tell the user to "check the website," "visit the link," or "contact the office." You are the expert—provide the answer directly using the data you have.
4. **HOD VERIFICATION:** If asked for an HOD, check the "UNIVERSITY LEADERSHIP" and "FACULTY" sections first. Example: If the context says Dr. Hisham Khalil is the HOD of AI, you MUST say Dr. Hisham Khalil.
5. **GPA CALCULATION:** You are an expert GPA helper. Use the standard UOL grading scale: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, F=0.0. Calculate step-by-step.
6. **STRESS & SUBMISSION SUPPORT:** If a student mentions being "stressed," "not ready," "ready still," "deadline," or "submission," provide extra reassurance. Tell them: "Take a deep breath. You've worked hard, and I'm here to ensure your portal information is accurate. We will get this ready together."
7. **EMPATHY & WELLBEING:** If a student expresses stress or exam pressure, console them warmly and recommend the University Counseling Center (UCC) or Office of Student Affairs (OSA).

### VERIFIED QUICK-FACTS (PRIORITY)
- HOD Artificial Intelligence: Dr. Hisham Khalil
- HOD Computer Science: Dr. Mehtab Afzal
- HOD Software Engineering: Dr. Sundus Shahzeen
- HOD Physics: Dr. Muhammad Ashfaq Ahmad
- HOD Chemistry: Dr. Muhammad Iqbal
- HOD Mathematics: Dr. Muhammad Sharif
- HOD Electrical Engineering: Dr. Ghulam Abbas
- HOD Business Administration (LBS): Dr. Afshan Hamid
- HOD Law: Ms. Sundus Rauf
- HOD Pharmacy: Dr. Kashif Barkat
- Dean of FIT: Prof. Dr. Ibrar Hussain
- Dean of FET: Prof. Dr. Asad Mansoor Khan
- Chancellor: Mian Muhammad Mansha
- Vice Chancellor: Prof. Dr. Shahid Munir
- Bus Departure (Sheikhupura): 6:45 AM
- Bus Departure (Kasur): 7:00 AM

### <KNOWLEDGE_BASE>
${UOL_KNOWLEDGE}
### </KNOWLEDGE_BASE>

### <RELEVANT_CONTEXT>
${ragContextText || "No specific document context found for this query."}
### </RELEVANT_CONTEXT>

### INSTRUCTION
Provide a clear, professional, and definitive answer based on the above knowledge. Be precise with names, rooms, and timings.`;

    console.log(`[DEBUG] System Prompt Length: ${SYSTEM_PROMPT.length} characters.`);

    const modelNames = ["models/gemini-2.5-flash", "models/gemini-1.5-flash", "models/gemini-2.0-flash", "models/gemini-pro"];
    let response = "";
    let success = false;
    let lastError: any = null;

    for (const modelName of modelNames) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT,
            });

            // Build history for Gemini
            // We map 'user' -> 'user' and 'assistant' -> 'model'
            let history = messages.slice(0, -1).map((m: any) => {
                const parts: any[] = [];
                if (m.image) {
                    const matches = m.image.match(/^data:(image\/\w+);base64,(.*)$/);
                    if (matches) {
                        parts.push({
                            inlineData: {
                                mimeType: matches[1],
                                data: matches[2]
                            }
                        });
                    }
                }
                parts.push({ text: m.content });
                return {
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts
                };
            });

            // CRITICAL: Gemini history must start with 'user' role.
            // If the first message is from the 'model' (assistant), we skip it.
            while (history.length > 0 && history[0].role !== 'user') {
                history.shift();
            }

            const chat = model.startChat({ history });

            // Handle last message which might have an image
            const lastMsgObj = messages[messages.length - 1];
            let sendParts: any = lastMsgObj.content;

            if (lastMsgObj.image) {
                const matches = lastMsgObj.image.match(/^data:(image\/\w+);base64,(.*)$/);
                if (matches) {
                    sendParts = [
                        {
                            inlineData: {
                                mimeType: matches[1],
                                data: matches[2]
                            }
                        },
                        { text: lastMsgObj.content }
                    ];
                }
            }

            const result = await chat.sendMessage(sendParts);
            response = result.response.text();
            success = true;
            break;
        } catch (err: any) {
            lastError = err;
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("404")) {
                console.warn(`Model ${modelName} not found, trying next...`);
                continue;
            }
            // If it's a 429 or other fatal error, stop and let the main catch handle it
            throw err;
        }
    }

    if (!success && lastError) throw lastError;

    return NextResponse.json({ response });

  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const statusStr = typeof error === 'object' && error !== null && 'status' in error ? String((error as any).status) : '';

    if (errorMsg.includes("429") || statusStr === "429") {
      return NextResponse.json({
        response: "⚠️ The AI is receiving too many requests right now. Please wait 30 seconds and try again. This is a free-tier API limit."
      });
    }

    return NextResponse.json({
      response: `⚠️ Chat Error: ${errorMsg}. Please ensure your API key is valid and has access to the model.`
    });
  }
}
