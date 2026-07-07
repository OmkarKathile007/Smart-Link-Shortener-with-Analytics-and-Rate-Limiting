import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import apiLimiter from "./middleware/rateLimit.middleware.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(apiLimiter);

app.get("/", (req, res) => {
  res.json({ message: "Smart Link Shortener API Running..." });
});

export default app;
