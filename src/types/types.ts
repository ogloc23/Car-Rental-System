import { PrismaClient } from "@prisma/client";
import express from "express";

export interface Context {
  req: express.Request;
  user?: { id: string; role: string };
  prisma: PrismaClient;
}
