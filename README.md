# THE UNIVERSITY OF LAHORE (UOL) - Student Assistant Portal

A full-stack RAG (Retrieval-Augmented Generation) portal for UOL students and admin staff.
Powered by Next.js 15, PostgreSQL (pgvector), and Google Gemini.

## Features
- **Admin Dashboard**: Upload PDFs (Class Schedules, Datesheets).
- **Student Chatbot**: AI Assistant that answers queries based on uploaded documents.
- **RAG Knowledge Base**: Automatically vectors and indexes university documents.

## Prerequisites
1.  **Node.js** (v18+)
2.  **PostgreSQL Database** with `vector` extension enabled.
3.  **Google Gemini API Key**.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a file named `.env` in the root directory (`uol-portal`) and add:

```env
# Connect to your PostgreSQL database (must support pgvector)
DATABASE_URL="postgresql://username:password@localhost:5432/uol_db"

# Your Google Gemini API Key
GEMINI_API_KEY="AIzaSy..."
```

### 3. Initialize Database
Push the schema to your database:

```bash
npx prisma db push
```

### 4. Run the Application
Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## How to Usage

1.  **Admin**: Go to `/admin/dashboard`. Upload a PDF (e.g., a Course Schedule).
2.  **Student**: Go to `/student/onboarding`, select your department, and then ask the Chatbot questions about the uploaded PDF.

## Troubleshooting

### "Can't reach database server"
- Ensure PostgreSQL is running.
- Check if the port in `.env` matches your database port.

### "Module not found: pdf-parse"
- This is a known build-time issue. use `npm run dev` instead of `npm run build`.

### "PrismaClient is not a constructor"
- Run `npm install` and `npx prisma generate` again.
