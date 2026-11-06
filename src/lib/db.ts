import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Giao dịch tương tác mặc định chỉ có 5 giây; cơ sở dữ liệu ở xa (Neon) cần rộng hơn
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ transactionOptions: { timeout: 15_000, maxWait: 10_000 } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
