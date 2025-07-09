// Increase the timeout for async operations in tests
jest.setTimeout(10000);

// Mock Supabase
jest.mock("../src/config/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockImplementation((token) => {
        if (token === "valid_token") {
          return Promise.resolve({
            data: { user: { id: "test-user-id" } },
            error: null,
          });
        }
        return Promise.resolve({
          data: { user: null },
          error: "Invalid token",
        });
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: { id: "test-conversation-id" },
          error: null,
        });
      }),
      insert: jest.fn().mockImplementation((data) => ({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...data,
            id: "test-message-id",
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      })),
      update: jest.fn().mockResolvedValue({ error: null }),
    }),
  },
}));
