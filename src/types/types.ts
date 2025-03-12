import { PrismaClient } from "@prisma/client";
import express from "express";

export interface Context {
  req: express.Request;
  user?: { id: string; role: string };
  prisma: PrismaClient;
}

export interface DecodedToken {
  id: string;
  role: string;
  iat?: number;
  exp?: number;
}