// Parse SSE frames independently of TCP chunk boundaries and newline style.
export async function* providerEvents(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let data: string[] = [];
  let frameSize = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      if (done && pending && !pending.endsWith("\n")) pending += "\n";
      let boundary: number;
      while ((boundary = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, boundary).replace(/\r$/, "");
        pending = pending.slice(boundary + 1);
        if (line === "") {
          if (data.length) {
            const payload = data.join("\n");
            data = [];
            frameSize = 0;
            if (payload.trim() === "[DONE]") return;
            // Per the SSE spec a frame with an empty data buffer dispatches nothing.
            if (payload !== "") yield payload;
          }
        } else if (line.startsWith("data:")) {
          const part = line.slice(5).replace(/^ /, "");
          frameSize += part.length;
          if (frameSize > 100000)
            throw new Error("AI response frame exceeds the size limit.");
          data.push(part);
        }
      }
      if (pending.length > 100000)
        throw new Error("AI response frame exceeds the size limit.");
      if (done) {
        const payload = data.join("\n");
        if (payload && payload.trim() !== "[DONE]") yield payload;

        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
