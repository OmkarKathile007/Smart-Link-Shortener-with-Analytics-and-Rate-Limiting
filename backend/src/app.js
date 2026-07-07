import express from "express";
import cors from "cors";
import apiLimiter from "./middleware/rateLimit.middleware.js";

const app = express();

// Auth uses Bearer tokens in the Authorization header (not cookies), so we do
// not enable `credentials`. Turn it back only if you switch to cookie auth.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(apiLimiter); 

app.get("/", (req, res) => {
  res.json({ message: "Smart Link Shortener API Running..." });
});

export default app;
