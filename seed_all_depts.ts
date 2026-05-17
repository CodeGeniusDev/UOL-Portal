import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { UOL_DEPARTMENTS } from "./lib/departments.ts";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
    console.log("Seeding comprehensive UOL departments...");
    try {
        // First ensure 'default' exists just in case any old references remain
        await prisma.department.upsert({
            where: { id: "default" },
            update: {},
            create: { id: "default", name: "Default Department" }
        });

        // Insert all real departments
        for (const dept of UOL_DEPARTMENTS) {
            await prisma.department.upsert({
                where: { name: dept },
                update: {},
                create: {
                    id: dept.replace(/\s+/g, '-').toLowerCase(), // e.g., "faculty-of-law"
                    name: dept
                }
            });
            console.log(`Seeded: ${dept}`);
        }
        
        console.log("All departments seeded successfully.");
    } catch (e) {
        console.error("Seeding error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
