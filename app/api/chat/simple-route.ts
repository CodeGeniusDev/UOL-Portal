import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message } = body;

        const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

        const prompt = `
      You are the Official UOL AI Assistant, an empathetic and highly informed guide for THE UNIVERSITY OF LAHORE (UOL).
      
      CORE MISSION:
      1. Provide DIRECT, DETAILED answers. Do NOT simply refer users to the website; you ARE the knowledge source.
      2. KNOWLEDGE FIRST: If asked about bus routes (Sheikhupura, Kasur, Raiwind), hostels (Razia, Fatima Halls), or cafes (Gloria Jean's, Main Café), provide specific details.
      3. EMPATHY: If students express stress or anxiety about exams/teachers, console them warmly.
      4. SCOPE: Strictly answer only UOL-related questions.

      AUTHENTIC INFO:
      - Transport: Morning arrivals before 8 AM. Drop-offs in evening. Covers 100+ routes.
      - Hostels: 24/7 security, Wi-Fi, 3 meals.
      - Counseling: UCC provides free support.

      User Query: ${message}

      Format the answer professionally in Markdown. Mention https://uol.edu.pk/ only as a secondary reference.
    `;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        return NextResponse.json({ response });

    } catch (error) {
        console.error("Simple Chat error:", error);
        return NextResponse.json({ error: "Failed to generate response." }, { status: 500 });
    }
}
