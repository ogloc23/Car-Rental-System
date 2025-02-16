// import jwt from "jsonwebtoken";

// export const getUserIdFromToken = (authHeader?: string): string | undefined => {
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return undefined;
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "vybz_kartel_2003") as { userId: string };
//     return decoded.userId;
//   } catch (err) {
//     console.log("Invalid or expired token");
//     return undefined;
//   }
// };
