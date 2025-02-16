// src/types/express.d.ts

import * as express from "express";

// Declare module to extend Express' Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string; // Add the userId property (optional, since it may not exist if no token is provided)
    }
  }
}
