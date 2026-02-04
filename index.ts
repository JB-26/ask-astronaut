const NASA_API_KEY = process.env.NASA_API_KEY;

if (!NASA_API_KEY) {
  throw new Error("NASA_API_KEY environment variable is not set");
}

// routes for HTTP server
const app = Bun.serve({
  port: 3000,
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

    // 404
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running on ${app.url}`);
