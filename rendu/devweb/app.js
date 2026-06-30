const messagesEl = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const promptEl = document.querySelector("#prompt");
const providerEl = document.querySelector("#provider");
const modelEl = document.querySelector("#model");
const sendBtn = document.querySelector("#sendBtn");
const clearBtn = document.querySelector("#clearBtn");
const tempEl = document.querySelector("#temperature");
const tempValueEl = document.querySelector("#tempValue");
const connectionLabel = document.querySelector("#connectionLabel");
const ollamaDot = document.querySelector("#ollamaDot");
const tritonDot = document.querySelector("#tritonDot");

const history = [
  {
    role: "assistant",
    content:
      "Bonjour. Je suis l'assistant financier TechCorp. Posez une question sur un concept financier, un risque, un budget ou une analyse d'investissement.",
  },
];

function renderMessages() {
  messagesEl.innerHTML = "";
  for (const message of history) {
    const item = document.createElement("article");
    item.className = `message ${message.role}`;
    const role = document.createElement("span");
    role.className = "role";
    role.textContent = message.role === "user" ? "Vous" : message.role === "error" ? "Erreur" : "Assistant";
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

async function refreshHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    setDot(ollamaDot, health.ollama);
    setDot(tritonDot, health.triton);
    const active = providerEl.value === "triton" ? health.triton : health.ollama;
    connectionLabel.textContent = active ? "Connecte" : "Deconnecte";
    connectionLabel.style.color = active ? "var(--brand)" : "var(--danger)";
  } catch {
    setDot(ollamaDot, false);
    setDot(tritonDot, false);
    connectionLabel.textContent = "Deconnecte";
    connectionLabel.style.color = "var(--danger)";
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
        model: modelEl.value.trim(),
        temperature: tempEl.value,
        messages: history.filter((message) => message.role !== "error"),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur API");
    history.push({ role: "assistant", content: data.text || "Reponse vide." });
  } catch (error) {
    history.push({ role: "error", content: error.message });
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

clearBtn.addEventListener("click", () => {
  history.splice(1);
  renderMessages();
});

providerEl.addEventListener("change", refreshHealth);
tempEl.addEventListener("input", () => {
  tempValueEl.textContent = Number(tempEl.value).toFixed(2);
});

renderMessages();
refreshHealth();
setInterval(refreshHealth, 10000);
