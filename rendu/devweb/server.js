const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const TRITON_URL = process.env.TRITON_URL || "http://localhost:8000";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "phi35-financial";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 240000);

const publicDir = __dirname;

function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function getLastUserMessage(messages) {
  return [...messages].reverse().find((message) => message.role === "user")?.content || "";
}

function formatPrompt(messages) {
  const turns = messages
    .filter((message) => ["user", "assistant"].includes(message.role) && message.content)
    .map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";
      return `${role}: ${message.content}`;
    });
  return `${turns.join("\n")}\nAssistant:`;
}

async function proxyOllamaChat(payload) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const model = payload.model || DEFAULT_MODEL;
  const options = {
    temperature: Number(payload.temperature ?? 0.4),
    top_p: Number(payload.top_p ?? 0.9),
    num_predict: Number(payload.max_tokens ?? 512),
  };

  const response = await fetchWithTimeout(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options,
    }),
  });

  if (!response.ok) {
    const chatError = await response.text();
    const fallback = await fetchWithTimeout(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: formatPrompt(messages),
        stream: false,
        options,
      }),
    });
    if (!fallback.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${chatError}; fallback ${fallback.status}: ${await fallback.text()}`);
    }
    const fallbackData = await fallback.json();
    return {
      provider: "ollama",
      model: fallbackData.model || model,
      text: fallbackData.response || "",
    };
  }

  const data = await response.json();
  return {
    provider: "ollama",
    model: data.model || model,
    text: data.message?.content || data.response || "",
  };
}

async function proxyTritonChat(payload) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const prompt = getLastUserMessage(messages) || payload.prompt || "";
  if (!prompt.trim()) {
    throw new Error("Triton requires a non-empty prompt.");
  }

  const response = await fetchWithTimeout(`${TRITON_URL}/v2/models/phi35_financial/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: [
        {
          name: "text_input",
          shape: [1],
          datatype: "BYTES",
          data: [prompt],
        },
      ],
      outputs: [{ name: "text_output" }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Triton HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const output = data.outputs?.find((item) => item.name === "text_output");
  const outputData = Array.isArray(output?.data) ? output.data.flat(Infinity) : [];
  return {
    provider: "triton",
    model: "phi35_financial",
    text: outputData.join("\n"),
  };
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/health") {
    const checks = await Promise.allSettled([
      fetchWithTimeout(`${OLLAMA_URL}/api/tags`, {}, 5000),
      fetchWithTimeout(`${TRITON_URL}/v2/health/ready`, {}, 5000),
    ]);
    return sendJson(res, 200, {
      app: "ok",
      ollama: checks[0].status === "fulfilled" && checks[0].value.ok,
      triton: checks[1].status === "fulfilled" && checks[1].value.ok,
      ollamaUrl: OLLAMA_URL,
      tritonUrl: TRITON_URL,
      defaultModel: DEFAULT_MODEL,
    });
  }

  if (req.method === "POST" && req.url === "/api/chat") {
    try {
      const payload = await readJson(req);
      const provider = payload.provider || "ollama";
      if (!["ollama", "triton"].includes(provider)) {
        return sendJson(res, 400, { error: `Unknown provider: ${provider}` });
      }
      const result = provider === "triton" ? await proxyTritonChat(payload) : await proxyOllamaChat(payload);
      return sendJson(res, 200, result);
    } catch (error) {
      const message = error.name === "AbortError" ? "Inference request timed out." : error.message;
      return sendJson(res, 502, { error: message });
    }
  }

  return false;
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(publicDir, requestPath));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    };
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    const handled = await handleApi(req, res);
    if (handled !== false) return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`TechCorp chat UI: http://localhost:${PORT}`);
  console.log(`Ollama target: ${OLLAMA_URL} / model ${DEFAULT_MODEL}`);
  console.log(`Triton target: ${TRITON_URL}`);
});

server.on("error", (error) => {
  console.error(`Server failed: ${error.message}`);
  process.exitCode = 1;
});
