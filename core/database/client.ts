import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// ======================
// DATABASE URL
// ======================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in environment variables.");
}

// ======================
// PG POOL
// ======================

const pool = new Pool({
  connectionString,
});

// ======================
// PRISMA ADAPTER
// ======================

const adapter = new PrismaPg(pool);

// ======================
// GLOBAL TYPE
// ======================

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// ======================
// PRISMA CLIENT
// ======================

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// ======================
// PREVENT MULTIPLE CLIENTS
// ======================

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}