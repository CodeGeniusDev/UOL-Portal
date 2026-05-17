
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function listModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        console.log("Available models from API:");
        data.models.forEach((m: any) => console.log(`- ${m.name} (${m.displayName})`));
    } catch (e) {
        console.error("Error fetching models:", e);
    }
}

listModels();
