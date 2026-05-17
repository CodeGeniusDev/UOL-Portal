const http = require('http');

const PORT = 3000;
const API_URL = `http://127.0.0.1:${PORT}/api/chat`;

async function ask(messages) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, departmentId: "faculty-of-information-technology" })
  });
  const data = await response.json();
  return data.response;
}

async function runTests() {
  console.log("🚀 Starting Comprehensive UOL AI Tests...");

  const testCases = [
    {
      name: "1. HOD & Key Facts",
      messages: [{ role: "user", content: "Who is the HOD of Artificial Intelligence?" }]
    },
    {
      name: "2. Bus Routes",
      messages: [{ role: "user", content: "What time does the bus leave for Sheikhupura?" }]
    },
    {
      name: "3. Empathy & Stress",
      messages: [{ role: "user", content: "I am feeling very overwhelmed and stressed about my finals." }]
    },
    {
      name: "4. GPA Calculator",
      messages: [{ role: "user", content: "Can you calculate my GPA? I got an A in AI (3 credits) and a B+ in Database (4 credits)." }]
    },
    {
      name: "5. Out of Scope (Should decline)",
      messages: [{ role: "user", content: "What is the capital of France?" }]
    },
    {
      name: "6. Memory & Context (Multi-turn)",
      messages: [
        { role: "user", content: "My name is Ali and I study Software Engineering." },
        { role: "assistant", content: "Nice to meet you, Ali! How can I help you with Software Engineering today?" },
        { role: "user", content: "What is my name and major?" }
      ]
    },
    {
      name: "7. Timetable / RAG Integration",
      messages: [{ role: "user", content: "What does the BSAI Timetable look like for Spring?" }]
    }
  ];

  for (const tc of testCases) {
    console.log(`\n\n-------------------------------------------------`);
    console.log(`🧪 Testing: ${tc.name}`);
    console.log(`👤 User: ${tc.messages[tc.messages.length - 1].content}`);
    try {
      const reply = await ask(tc.messages);
      console.log(`\n🤖 AI Response:\n${reply}`);
      // Sleep for 15 seconds
      await new Promise(r => setTimeout(r, 15000));
    } catch (e) {
      console.error(`❌ Error:`, e.message);
    }
  }
}

runTests();
