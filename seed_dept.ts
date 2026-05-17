import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
    console.log("Seeding default department...");
    try {
        const dept = await prisma.department.upsert({
            where: { id: "default" },
            update: {},
            create: {
                id: "default",
                name: "Default Department"
            }
        });
        console.log("Department seeded successfully:", dept);
    } catch (e) {
        console.error("Seeding error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
