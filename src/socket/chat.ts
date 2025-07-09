import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import { supabase } from "../config/supabase";
import { Message } from "../types/schema";

interface ChatSocket extends Socket {
  userId?: string;
}

async function joinUserRooms(
  socket: ChatSocket,
  userId: string
): Promise<void> {
  try {
    const { data: conversations, error } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);

    if (error) throw error;

    conversations?.forEach((conv) => {
      socket.join(conv.conversation_id);
    });
  } catch (error) {
    console.error("Failed to join user rooms:", error);
  }
}

export function createChatServer(server: HTTPServer): Server {
  const io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  console.log("✅ Socket.IO server initialized");

  io.on("connection", async (socket: ChatSocket) => {
    console.log("👤 Client connected:", socket.id);

    // Authenticate socket connection
    socket.on("authenticate", async (token: string) => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
          socket.emit("error", "Authentication failed");
          socket.disconnect();
          return;
        }

        socket.userId = user.id;
        await joinUserRooms(socket, user.id);
        socket.emit("authenticated");
      } catch (error) {
        socket.emit("error", "Authentication failed");
        socket.disconnect();
      }
    });

    // Handle joining a conversation
    socket.on("join_conversation", async (conversationId: string) => {
      if (!socket.userId) {
        socket.emit("error", "Not authenticated");
        return;
      }

      try {
        const { data: member, error } = await supabase
          .from("conversation_members")
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("user_id", socket.userId)
          .single();

        if (error || !member) {
          socket.emit("error", "Not a member of this conversation");
          return;
        }

        socket.join(conversationId);
        socket.emit("joined_conversation", conversationId);
      } catch (error) {
        socket.emit("error", "Failed to join conversation");
      }
    });

    // Handle sending messages
    socket.on("send_message", async (message: Partial<Message>) => {
      if (!socket.userId) {
        socket.emit("error", "Not authenticated");
        return;
      }

      try {
        const { data: newMessage, error } = await supabase
          .from("messages")
          .insert({
            ...message,
            sender_id: socket.userId,
          })
          .select("*, sender:users(*)")
          .single();

        if (error || !newMessage) {
          socket.emit("error", "Failed to send message");
          return;
        }

        // Emit to all members in the conversation
        io.to(message.conversation_id!).emit("new_message", newMessage);

        // Update last_message_at in conversation
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", message.conversation_id);
      } catch (error) {
        socket.emit("error", "Failed to send message");
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (conversationId: string) => {
      if (!socket.userId) return;
      socket.to(conversationId).emit("user_typing_start", socket.userId);
    });

    socket.on("typing_stop", (conversationId: string) => {
      if (!socket.userId) return;
      socket.to(conversationId).emit("user_typing_stop", socket.userId);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  return io;
}
