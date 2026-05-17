
import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

async function test() {
    console.log("Testing DB connection...");
    try {
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log("DB connected:", result);

        console.log("Checking vector extension...");
        const extensions: any = await prisma.$queryRaw`SELECT * FROM pg_extension WHERE extname = 'vector'`;
        console.log("Vector extension count:", extensions.length);

    } catch (e) {
        console.error("DB Error:", e);
    }

    console.log("Testing Gemini AI...");
    try {
        const result = await model.generateContent("Say hello");
        console.log("AI Response:", result.response.text());
    } catch (e) {
        console.error("AI Error:", e);
    }

    await prisma.$disconnect();
}

test();
