import { PrismaClient } from "@prisma/client";
import { Request } from "express";

export interface Context {
  req: Request; // Ensure request object exists
  user?: { id: string; role: string }; // Optional user object
  prisma: PrismaClient;
}
