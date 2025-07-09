import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import { createChatServer } from "./socket/chat";
import { errorHandler } from "./middleware/error";
import conversationsRouter from "./routes/conversations";
import roomsRouter from "./routes/rooms";
import { supabase } from "./config/supabase";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Check Supabase connection
supabase.auth.getSession().then(({ error }) => {
  if (error) {
    console.error("❌ Supabase connection failed:", error.message);
  } else {
    console.log("✅ Supabase connected successfully");
  }
});

// Initialize socket.io server
createChatServer(httpServer);

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json());

// Routes
app.use("/api/conversations", conversationsRouter);
app.use("/api/rooms", roomsRouter);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
