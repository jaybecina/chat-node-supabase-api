import { createServer, Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { createChatServer } from "../src/socket/chat";
import { io as ClientSocket, Socket } from "socket.io-client";
import { Message } from "../src/types/schema";

interface ServerToClientEvents {
  error: (message: string) => void;
  authenticated: () => void;
  joined_conversation: (conversationId: string) => void;
  new_message: (message: Message) => void;
  user_typing_start: (userId: string) => void;
  user_typing_stop: (userId: string) => void;
}

interface ClientToServerEvents {
  authenticate: (token: string) => void;
  join_conversation: (conversationId: string) => void;
  send_message: (message: Partial<Message>) => void;
  typing_start: (conversationId: string) => void;
  typing_stop: (conversationId: string) => void;
}

let httpServer: HTTPServer;
let io: Server;
let clientSocket: Socket<ServerToClientEvents, ClientToServerEvents>;

beforeAll((done) => {
  httpServer = createServer();
  io = createChatServer(httpServer);
  httpServer.listen(() => {
    const port = (httpServer.address() as { port: number }).port;
    clientSocket = ClientSocket(`http://localhost:${port}`);
    clientSocket.on("connect", done);
  });
});

afterAll(() => {
  io.close();
  clientSocket.close();
  httpServer.close();
});

beforeEach((done) => {
  // Clean up listeners
  clientSocket.removeAllListeners();
  // Ensure connection is established
  if (!clientSocket.connected) {
    clientSocket.connect();
  }
  done();
});

describe("Chat Server", () => {
  describe("Authentication", () => {
    test("should authenticate socket connection", (done) => {
      clientSocket.emit("authenticate", "valid_token");
      clientSocket.on("authenticated", () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    test("should fail authentication with invalid token", (done) => {
      clientSocket.emit("authenticate", "invalid_token");
      clientSocket.on("error", (message: string) => {
        expect(message).toBe("Authentication failed");
        done();
      });
    });
  });

  describe("Conversation Management", () => {
    beforeEach((done) => {
      // Authenticate before each conversation test
      clientSocket.emit("authenticate", "valid_token");
      clientSocket.on("authenticated", done);
    });

    test("should join a conversation", (done) => {
      clientSocket.emit("join_conversation", "conversation_id");
      clientSocket.on("joined_conversation", (conversationId: string) => {
        expect(conversationId).toBe("conversation_id");
        done();
      });
    });

    test("should send a message", (done) => {
      const message: Partial<Message> = {
        conversation_id: "conversation_id",
        content: "Hello!",
      };

      clientSocket.emit("join_conversation", "conversation_id");
      clientSocket.on("joined_conversation", () => {
        clientSocket.emit("send_message", message);
      });

      clientSocket.on("new_message", (newMessage: Message) => {
        expect(newMessage.content).toBe("Hello!");
        done();
      });
    }, 15000); // Increase timeout for this specific test
  });
});
