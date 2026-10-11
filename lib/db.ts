import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

// Cache the client on globalThis in ALL environments (including production).
// On Vercel serverless, warm instances reuse globalThis — without this, every
// request spins up a new PrismaClient, exhausts the Postgres connection
// pool, and causes intermittent 500s.
if (!globalForPrisma.prisma) globalForPrisma.prisma = db;
