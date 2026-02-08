import Anthropic from "@anthropic-ai/sdk";

const NASA_API_KEY = process.env.NASA_API_KEY;
const CLAUDE_KEY = process.env.CLAUDE_KEY;

if (!NASA_API_KEY) {
  throw new Error(
    "NASA_API_KEY environment variable is not set. Go to https://api.nasa.gov/ to create a key.",
  );
}

if (!CLAUDE_KEY) {
  throw new Error(
    "CLAUDE_KEY environment variable is not set. Go to https://platform.claude.com/ to purchase a key.",
  );
}

const anthropic = new Anthropic({
  apiKey: CLAUDE_KEY,
});

// routes for HTTP server
const app = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  async fetch(request) {
    const url = new URL(request.url);

    // homepage
    if (url.pathname === "/") {
      return new Response(Bun.file("index.html"), {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // about page
    if (url.pathname === "/about") {
      return new Response(Bun.file("about.html"), {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // NASA API
    if (url.pathname === "/api/apod") {
      try {
        const response = await fetch(
          `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&count=1`,
        );
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error(error);
        return new Response(
          JSON.stringify({ error: "Error fetching data from NASA API" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    // Claude API
    if (url.pathname === "/api/ask" && request.method === "POST") {
      try {
        const { question, imageUrl } = (await request.json()) as {
          question: string;
          imageUrl: string;
        };

        if (!question) {
          return new Response(
            JSON.stringify({ error: "Question is required" }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (!imageUrl) {
          return new Response(JSON.stringify({ error: "Image is required" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        // Create a streaming response
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const messageStream = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "image",
                        source: {
                          type: "url",
                          url: imageUrl,
                        },
                      },
                      {
                        type: "text",
                        text: question,
                      },
                    ],
                  },
                ],
                stream: true,
              });

              // loop through each chunk of the message stream
              for await (const event of messageStream) {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  // convert text to bytes and then send to the client
                  controller.enqueue(
                    new TextEncoder().encode(event.delta.text),
                  );
                }
              }

              // close client when done
              controller.close();
            } catch (error) {
              console.error(error);
              controller.error(error);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain",
            "Transfer-Encoding": "chunked",
          },
        });
      } catch (error) {
        console.error(error);
        return new Response(
          JSON.stringify({ error: "Error processing request" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    // serve the TypeScript file
    // using Bun to transpile it
    if (url.pathname === "/client.js") {
      const result = await Bun.build({
        entrypoints: ["./client.ts"],
        target: "browser",
      });

      const [output] = result.outputs;

      return new Response(output, {
        headers: {
          "Content-Type": "application/javascript",
        },
      });
    }

    // route for the compiled Tailwind CSS file
    if (url.pathname === "/styles.css") {
      console.log("Compiling Tailwind CSS...");
      return new Response(Bun.file("./src/output.css"), {
        headers: {
          "Content-Type": "text/css",
        },
      });
    }

    // 404
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running on ${app.url}`);
