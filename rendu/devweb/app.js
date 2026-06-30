const DEFAULT_MODEL = "phi35-financial";
const HEALTH_REFRESH_MS = 10000;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  messages: $("#messages"),
  chatForm: $("#chatForm"),
  prompt: $("#prompt"),
  provider: $("#provider"),
  sendBtn: $("#sendBtn"),
  clearBtn: $("#clearBtn"),
  temperature: $("#temperature"),
  tempValue: $("#tempValue"),
  connectionLabel: $("#connectionLabel"),
  activeProvider: $("#activeProvider"),
  ollamaDot: $("#ollamaDot"),
  tritonDot: $("#tritonDot"),
  promptChips: $$("[data-prompt]"),
};

const providerLabels = {
  ollama: "Ollama",
  triton: "Triton",
};

const history = [
  {
    role: "assistant",
    content:
      "Bonjour. Je suis l'assistant financier TechCorp. Posez une question sur un concept financier, un risque, un budget ou une analyse d'investissement.",
  },
];

function setServiceStatus(dot, isOnline) {
  dot.classList.toggle("ok", isOnline);
  dot.classList.toggle("fail", !isOnline);
}

function setSending(isSending) {
  elements.sendBtn.disabled = isSending;
  elements.prompt.disabled = isSending;
  elements.sendBtn.textContent = isSending ? "Envoi..." : "Envoyer";
}

function autoResizePrompt() {
  elements.prompt.style.height = "auto";
  elements.prompt.style.height = `${Math.min(elements.prompt.scrollHeight, 130)}px`;
}

function renderMessages() {
  elements.messages.innerHTML = "";

  for (const message of history) {
    const item = document.createElement("article");
    const role = document.createElement("span");
    const content = document.createElement("div");

    item.className = `message ${message.role}`;
    role.className = "role";
    role.textContent =
      message.role === "user" ? "Vous" : message.role === "error" ? "Erreur" : `Assistant ${message.provider || ""}`;
    content.textContent = message.content;

    item.append(role, content);
    elements.messages.appendChild(item);
  }

  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function syncProviderLabel() {
  elements.activeProvider.textContent = providerLabels[elements.provider.value] || elements.provider.value;
}

async function refreshHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();

    setServiceStatus(elements.ollamaDot, Boolean(health.ollama));
    setServiceStatus(elements.tritonDot, Boolean(health.triton));

    const activeProviderIsOnline = elements.provider.value === "triton" ? health.triton : health.ollama;
    elements.connectionLabel.textContent = activeProviderIsOnline ? "Connecte" : "Deconnecte";
    elements.connectionLabel.classList.toggle("fail", !activeProviderIsOnline);
  } catch {
    setServiceStatus(elements.ollamaDot, false);
    setServiceStatus(elements.tritonDot, false);
    elements.connectionLabel.textContent = "Deconnecte";
    elements.connectionLabel.classList.add("fail");
  }
}

async function sendMessage(content) {
  history.push({ role: "user", content });
  renderMessages();
  setSending(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: elements.provider.value,
        model: DEFAULT_MODEL,
        temperature: elements.temperature.value,
        messages: history.filter((message) => message.role !== "error"),
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur API");

    history.push({
      role: "assistant",
      provider: providerLabels[data.provider] || "",
      content: data.text || "Reponse vide.",
    });
  } catch (error) {
    history.push({
      role: "error",
      content: `${providerLabels[elements.provider.value]} indisponible: ${error.message}`,
    });
  } finally {
    setSending(false);
    renderMessages();
    refreshHealth();
  }
}

elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const content = elements.prompt.value.trim();
  if (!content) return;

  elements.prompt.value = "";
  autoResizePrompt();
  sendMessage(content);
});

elements.prompt.addEventListener("input", autoResizePrompt);
elements.prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.chatForm.requestSubmit();
  }
});

elements.clearBtn.addEventListener("click", () => {
  history.splice(1);
  renderMessages();
  elements.prompt.focus();
});

elements.provider.addEventListener("change", () => {
  syncProviderLabel();
  refreshHealth();
});

elements.temperature.addEventListener("input", () => {
  elements.tempValue.textContent = Number(elements.temperature.value).toFixed(2);
});

elements.promptChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    elements.prompt.value = chip.dataset.prompt || "";
    autoResizePrompt();
    elements.prompt.focus();
  });
});

renderMessages();
syncProviderLabel();
autoResizePrompt();
refreshHealth();
setInterval(refreshHealth, HEALTH_REFRESH_MS);
