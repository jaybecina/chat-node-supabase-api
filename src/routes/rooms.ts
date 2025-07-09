import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { AuthenticatedHandler } from "../types/express";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
} from "../controllers/room";

const router = Router();

// Apply auth middleware to all room routes
router.use(authenticate as AuthenticatedHandler);

// Room CRUD operations
router.post("/", createRoom as AuthenticatedHandler);
router.get("/", getAllRooms as AuthenticatedHandler);
router.get("/:id", getRoomById as AuthenticatedHandler);
router.put("/:id", updateRoom as AuthenticatedHandler);
router.delete("/:id", deleteRoom as AuthenticatedHandler);

// Room membership operations
router.post("/:id/join", joinRoom as AuthenticatedHandler);
router.post("/:id/leave", leaveRoom as AuthenticatedHandler);

export default router;
