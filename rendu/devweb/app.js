const messagesEl = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const promptEl = document.querySelector("#prompt");
const providerEl = document.querySelector("#provider");
const sendBtn = document.querySelector("#sendBtn");
const clearBtn = document.querySelector("#clearBtn");
const tempEl = document.querySelector("#temperature");
const tempValueEl = document.querySelector("#tempValue");
const connectionLabel = document.querySelector("#connectionLabel");
const activeProviderEl = document.querySelector("#activeProvider");
const ollamaDot = document.querySelector("#ollamaDot");
const tritonDot = document.querySelector("#tritonDot");
const promptChips = document.querySelectorAll("[data-prompt]");

const history = [
  {
    role: "assistant",
    content:
      "Bonjour. Je suis l'assistant financier TechCorp. Posez une question sur un concept financier, un risque, un budget ou une analyse d'investissement.",
  },
];

const providerLabels = {
  ollama: "Ollama",
  triton: "Triton",
};
const DEFAULT_MODEL = "phi35-financial";

function renderMessages() {
  messagesEl.innerHTML = "";
  for (const message of history) {
    const item = document.createElement("article");
    item.className = `message ${message.role}`;
    const role = document.createElement("span");
    role.className = "role";
    role.textContent =
      message.role === "user" ? "Vous" : message.role === "error" ? "Erreur" : `Assistant ${message.provider || ""}`;
    const content = document.createElement("div");
    content.textContent = message.content;
    item.append(role, content);
    messagesEl.appendChild(item);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setDot(dot, ok) {
  dot.classList.toggle("ok", ok);
  dot.classList.toggle("fail", !ok);
}

function syncProviderControls() {
  activeProviderEl.textContent = providerLabels[providerEl.value] || providerEl.value;
}

async function refreshHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    setDot(ollamaDot, health.ollama);
    setDot(tritonDot, health.triton);
    const active = providerEl.value === "triton" ? health.triton : health.ollama;
    connectionLabel.textContent = active ? "Connecte" : "Deconnecte";
    connectionLabel.classList.toggle("fail", !active);
  } catch {
    setDot(ollamaDot, false);
    setDot(tritonDot, false);
    connectionLabel.textContent = "Deconnecte";
    connectionLabel.classList.add("fail");
  }
}

async function sendMessage(content) {
  history.push({ role: "user", content });
  renderMessages();
  sendBtn.disabled = true;
  sendBtn.textContent = "Envoi...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerEl.value,
        model: DEFAULT_MODEL,
        temperature: tempEl.value,
        messages: history.filter((message) => message.role !== "error"),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur API");
    history.push({ role: "assistant", provider: providerLabels[data.provider] || "", content: data.text || "Reponse vide." });
  } catch (error) {
    history.push({
      role: "error",
      content: `${providerLabels[providerEl.value]} indisponible: ${error.message}`,
    });
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Envoyer";
    renderMessages();
    refreshHealth();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = promptEl.value.trim();
  if (!content) return;
  promptEl.value = "";
  sendMessage(content);
});

promptEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

clearBtn.addEventListener("click", () => {
  history.splice(1);
  renderMessages();
});

providerEl.addEventListener("change", () => {
  syncProviderControls();
  refreshHealth();
});
tempEl.addEventListener("input", () => {
  tempValueEl.textContent = Number(tempEl.value).toFixed(2);
});

promptChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    promptEl.value = chip.dataset.prompt || "";
    promptEl.focus();
  });
});

renderMessages();
syncProviderControls();
refreshHealth();
setInterval(refreshHealth, 10000);
