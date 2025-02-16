// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// // Middleware to add userId to the request object
// export const jwtMiddleware = (req: Request, res: Response, next: NextFunction) => {
//   const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Bearer header
//   if (token) {
//     try {
//       const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'vybz_kartel_2003');
//       req.userId = decoded.userId; // Attach userId to request object
//     } catch (error) {
//       console.error('Invalid token', error);
//       return res.status(401).send('Invalid token');
//     }
//   }
//   next();
// };
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();
export const authMiddleware = async (context) => {
    const authHeader = context.req.headers.authorization;
    if (!authHeader) {
        throw new Error("Authentication required.");
    }
    const token = authHeader.split(" ")[1]; // Bearer <token>
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
        const user = await prisma.user.findUnique({ where: { id: decodedToken.userId } });
        if (!user) {
            throw new Error("User not found.");
        }
        context.user = { id: user.id, role: user.role };
    }
    catch (error) {
        throw new Error("Invalid or expired token.");
    }
};
