import crypto from "crypto";
import jwt from "jsonwebtoken";


export const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });


export const generateRefreshToken = () => crypto.randomBytes(40).toString("hex");


export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const refreshTokenExpiry = () => {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 7);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};
