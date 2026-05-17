import { processDocument, queryKnowledgeBase } from './lib/rag';
import { prisma } from './lib/prisma';
import fs from 'fs';
import * as dotenv from "dotenv";
dotenv.config();

async function testRAG() {
    console.log("Creating department and document record...");
    const department = await prisma.department.create({
        data: { name: "Computer Science - " + Date.now() }
    });

    const document = await prisma.document.create({
        data: {
            filePath: 'sample_schedule.txt',
            type: 'text/plain',
            departmentId: department.id
        }
    });

    console.log("Processing document (embedding and storing vectors)...");
    await processDocument('sample_schedule.txt', document.id);

    console.log("Querying knowledge base...");
    const results = await queryKnowledgeBase("What happens on Monday?", department.id);
    console.log("RAG Results:");
    console.dir(results, { depth: null });

    console.log("RAG test successful!");
    process.exit(0);
}

testRAG().catch(e => {
    console.error(e);
    process.exit(1);
});
