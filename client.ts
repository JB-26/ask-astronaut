async function loadApod() {
  // TODO: Fetch from /api/apod
  // TODO: Parse the JSON
  // TODO: Get the image URL from the response
  // TODO: Update the DOM to show the image
  // TODO: Return the image URL

  interface ApodData {
    url: string;
    title: string;
    explanation: string;
  }

  try {
    const response = await fetch("/api/apod");
    const data = (await response.json()) as ApodData[];

    // TypeScript will worry if data[0] is undefined as arrays can be empty
    if (!data[0]) {
      console.error("No data returned from API");
      return null;
    }

    const { url, title, explanation } = data[0];

    // had to update tsconfig.json to include DOM library
    const element = document.getElementById("image-container");

    // check if element exists before updating innerHTML
    if (!element) {
      console.error("Element not found");
      return null;
    }

    // clear any existing content
    element.innerHTML = "";

    // the data we retrieve from the API is a trusted source, however, we should still be cautious about XSS attacks
    // image element
    const img = document.createElement("img");
    img.src = url;
    img.alt = title;
    img.style.maxWidth = "100%";
    img.style.height = "auto";

    // title element
    const h2 = document.createElement("h2");
    h2.textContent = title;

    // explanation element
    const p = document.createElement("p");
    p.textContent = explanation;

    // append elements
    element.appendChild(img);
    element.appendChild(h2);
    element.appendChild(p);

    return { url, title, explanation };
  } catch (error) {
    console.error("Failed to load APOD", error);
    return null;
  }
}

async function handleAsk(event: Event, imageUrl: string) {
  // prevent page reload
  event.preventDefault();

  // tell TypeScript that this is an input element
  const input = document.getElementById("question-input") as HTMLInputElement;

  if (!input) {
    console.error("Input not found");
    return null;
  }

  // get value and remove whitespace at the beginning and end
  const question = input.value.trim();

  if (!question) {
    alert("Please enter a question");
    return null;
  }

  const response = document.getElementById("response-container");

  if (!response) {
    console.error("Response not found");
    return null;
  }

  response.innerHTML = "";

  const thinking = document.createElement("p");
  thinking.textContent = "Thinking...";

  response.append(thinking);

  try {
    const claudeResponse = await fetch("/api/ask", {
      method: "POST",
      body: JSON.stringify({ question, imageUrl }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!claudeResponse.ok) {
      throw new Error("Failed to get response from Claude");
    }

    // check if there's a response body for streaming the response from Claude
    if (!claudeResponse.body) {
      throw new Error("No response body");
    }

    // stream the response from Claude
    response.innerHTML = "";
    const responseText = document.createElement("p");
    response.append(responseText);

    const reader = claudeResponse.body.getReader();
    const decoder = new TextDecoder();

    // loop through the chunks of the response
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const text = decoder.decode(value);
      responseText.textContent += text;
    }
  } catch (error) {
    console.error("Failed to ask Claude", error);
    const errorElement = document.createElement("p");
    errorElement.textContent = "Failed to ask Claude";
    response.append(errorElement);
  }
}

// when page loads
window.addEventListener("DOMContentLoaded", async () => {
  const apodImage = await loadApod();
  if (!apodImage) {
    console.error("APOD image not found");
    return;
  }

  const apodImageUrl = apodImage.url;

  const form = document.getElementById("question-form");

  if (!form) {
    console.error("Form not found");
    return;
  }

  form.addEventListener("submit", (event) => {
    handleAsk(event, apodImageUrl);
  });
});
