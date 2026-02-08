import { describe, test, expect, mock, beforeAll, afterAll } from "bun:test";

// Set environment variables before importing the server
process.env.NASA_API_KEY = "test-nasa-key";
process.env.CLAUDE_KEY = "test-claude-key";
process.env.PORT = "3001";

// Mock Anthropic SDK before server import
mock.module("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: async () => ({
        async *[Symbol.asyncIterator]() {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "This is a mock response." },
          };
        },
      }),
    };
  },
}));

const BASE_URL = "http://localhost:3001";
const realFetch = globalThis.fetch;

const mockApodData = [
  {
    url: "https://apod.nasa.gov/apod/image/test.jpg",
    title: "Test Nebula",
    explanation: "A beautiful test nebula in deep space.",
  },
];

beforeAll(async () => {
  // Intercept NASA API calls, pass everything else through
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes("api.nasa.gov")) {
      return new Response(JSON.stringify(mockApodData), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return realFetch(input, init);
  }) as typeof fetch;

  // Start the server
  await import("./index.ts");
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

describe("Ask Astronaut Server", () => {
  describe("GET /", () => {
    test("returns the homepage with text/html content type", async () => {
      const response = await realFetch(`${BASE_URL}/`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
    });

    test("homepage contains expected content", async () => {
      const response = await realFetch(`${BASE_URL}/`);
      const html = await response.text();
      expect(html).toContain("Ask Astronaut");
    });
  });

  describe("GET /about", () => {
    test("returns the about page with text/html content type", async () => {
      const response = await realFetch(`${BASE_URL}/about`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
    });
  });

  describe("GET /client.js", () => {
    test("returns transpiled JavaScript", async () => {
      const response = await realFetch(`${BASE_URL}/client.js`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain(
        "application/javascript",
      );
    });
  });

  describe("GET /styles.css", () => {
    test("returns CSS stylesheet", async () => {
      const response = await realFetch(`${BASE_URL}/styles.css`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/css");
    });
  });

  describe("Unknown routes", () => {
    test("returns 404 for unknown paths", async () => {
      const response = await realFetch(`${BASE_URL}/nonexistent`);
      expect(response.status).toBe(404);
    });

    test("GET /api/ask returns 404 (only POST is supported)", async () => {
      const response = await realFetch(`${BASE_URL}/api/ask`);
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/apod", () => {
    test("returns APOD data as JSON", async () => {
      const response = await realFetch(`${BASE_URL}/api/apod`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain(
        "application/json",
      );
      const data = await response.json();
      expect(data).toEqual(mockApodData);
    });

    test("response contains url, title, and explanation", async () => {
      const response = await realFetch(`${BASE_URL}/api/apod`);
      const data = await response.json();
      expect(data[0]).toHaveProperty("url");
      expect(data[0]).toHaveProperty("title");
      expect(data[0]).toHaveProperty("explanation");
    });
  });

  describe("POST /api/ask", () => {
    test("returns 400 when question is missing", async () => {
      const response = await realFetch(`${BASE_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: "https://example.com/image.jpg" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Question is required");
    });

    test("returns 400 when imageUrl is missing", async () => {
      const response = await realFetch(`${BASE_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What is this?" }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Image is required");
    });

    test("returns 400 when question is empty string", async () => {
      const response = await realFetch(`${BASE_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "",
          imageUrl: "https://example.com/image.jpg",
        }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Question is required");
    });

    test("returns 500 when body is invalid JSON", async () => {
      const response = await realFetch(`${BASE_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Error processing request");
    });

    test("returns streaming response with valid input", async () => {
      const response = await realFetch(`${BASE_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "What is in this image?",
          imageUrl: "https://example.com/image.jpg",
        }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/plain");
      const text = await response.text();
      expect(text).toBe("This is a mock response.");
    });
  });
});
