import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getAllConversations,
  createDirectConversation,
  createGroupConversation,
  getMessagesForConversation,
  addMemberToConversation,
} from "../controllers/conversationController";

const router = Router();

// Get all conversations for the authenticated user
router.get("/", authenticate, getAllConversations);

// Create a new one-to-one conversation
router.post("/direct", authenticate, createDirectConversation);

// Create a new group conversation
router.post("/group", authenticate, createGroupConversation);

// Get messages for a conversation
router.get(
  "/:conversationId/messages",
  authenticate,
  getMessagesForConversation
);

// Add member to group conversation
router.post("/:conversationId/members", authenticate, addMemberToConversation);

export default router;
