import "dotenv/config"; 
import mongoose from "mongoose";

import app from "./app.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import linkRoutes from "./routes/link.routes.js";
import redirectRoutes from "./routes/redirect.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";


const PORT = process.env.PORT || 5000;

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/links", linkRoutes);

// Public redirect — /s/:code → longUrl
// NOTE: /s/ prefix isliye taaki /api/* routes se conflict na ho
app.use("/s", redirectRoutes);

// 404 + centralized error handling — must be registered after all routes.
app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown: stop accepting connections, close the DB, then exit.
const shutdown = (signal, err) => {
  if (err) console.error(`${signal}:`, err);
  else console.log(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    try {
      await mongoose.connection.close();
    } catch (closeErr) {
      console.error("Error closing MongoDB connection:", closeErr);
    }
    process.exit(err ? 1 : 0);
  });

  // Force-exit if the graceful close hangs.
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("unhandledRejection", (reason) =>
  shutdown("unhandledRejection", reason)
);
process.on("uncaughtException", (err) => shutdown("uncaughtException", err));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
