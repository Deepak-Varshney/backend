import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  userId: string;
}

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions);

export const verifyToken = (token: string) =>
  jwt.verify(token, SECRET) as JwtPayload;
