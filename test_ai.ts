
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function testAI() {
    console.log("Testing Gemini AI...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you working?");
        console.log("AI Response:", result.response.text());
    } catch (e) {
        console.error("AI Error:", e);
    }
}

testAI();
