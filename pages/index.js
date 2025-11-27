// pages/index.js
import { useEffect, useState } from "react";

export default function Home() {
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [botToken, setBotToken] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    fetch("/api/keys")
      .then((r) => r.json())
      .then(setKeys)
      .catch(() => {});

    fetch("/api/bot-config")
      .then((r) => r.json())
      .then((cfg) => cfg && setBotToken(cfg.telegramBotToken))
      .catch(() => {});
  }, []);

  async function addKey(e) {
    e.preventDefault();
    if (!newKey.trim()) return;
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey.trim(), label: newLabel.trim() })
    });
    const data = await res.json();
    setKeys((k) => [data, ...k]);
    setNewKey("");
    setNewLabel("");
  }

  async function toggleKey(id, active) {
    const res = await fetch("/api/keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active })
    });
    const updated = await res.json();
    setKeys((prev) => prev.map((k) => (k._id === updated._id ? updated : k)));
  }

  async function deleteKey(id) {
    if (!confirm("Delete this key?")) return;
    await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setKeys((prev) => prev.filter((k) => k._id !== id));
  }

  async function saveBotToken(e) {
    e.preventDefault();
    if (!botToken.trim()) return;
    await fetch("/api/bot-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramBotToken: botToken.trim() })
    });
    alert("Bot token saved");
  }

  async function sendTestChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setLoadingChat(true);
    setChatReply("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput.trim() })
      });
      const data = await res.json();
      setChatReply(data.reply || "No reply");
    } catch {
      setChatReply("Error talking to Yuki.");
    } finally {
      setLoadingChat(false);
    }
  }

  const page = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "24px"
  };

  const wrap = {
    width: "100%",
    maxWidth: "1080px",
    borderRadius: "20px",
    padding: "20px 18px 24px",
    border: "1px solid rgba(56,189,248,0.45)",
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 55%), rgba(15,23,42,0.96)",
    boxShadow: "0 20px 50px rgba(15,23,42,0.9)",
    backdropFilter: "blur(16px)"
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
    gap: "18px",
    marginTop: "16px"
  };

  const card = {
    borderRadius: "16px",
    border: "1px solid rgba(148,163,184,0.4)",
    padding: "14px 14px 16px",
    background: "rgba(15,23,42,0.85)"
  };

  const label = {
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginBottom: "4px",
    display: "block"
  };

  const input = {
    width: "100%",
    padding: "9px 11px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.8)",
    background: "rgba(15,23,42,0.95)",
    color: "#e5e7eb",
    fontSize: "0.85rem",
    marginBottom: "8px"
  };

  const btn = {
    padding: "8px 14px",
    borderRadius: "999px",
    border: "none",
    background:
      "linear-gradient(130deg, #22d3ee, #6366f1, #ec4899)",
    color: "#0f172a",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer"
  };

  return (
    <main style={page}>
      <div style={wrap}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background:
                    "radial-gradient(circle, #22c55e 0, #16a34a 40%, #166534 100%)",
                  boxShadow: "0 0 16px rgba(34,197,94,0.9)"
                }}
              ></span>
              Yuki · AI Orchestrator
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "#9ca3af",
                marginTop: "4px"
              }}
            >
              Multi Gemini keys · MongoDB · Telegram bot · Auto failover
            </div>
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              padding: "4px 10px",
              borderRadius: "999px",
              border: "1px solid rgba(56,189,248,0.8)",
              background:
                "linear-gradient(120deg, rgba(8,47,73,0.8), rgba(37,99,235,0.35))"
            }}
          >
            Yuki Online
          </div>
        </header>

        <section style={grid}>
          <div style={card}>
            <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
              Gemini API Keys
            </h3>
            <form onSubmit={addKey} style={{ marginBottom: "10px" }}>
              <label style={label}>Label (optional)</label>
              <input
                style={input}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Main key / Backup key..."
              />
              <label style={label}>API Key</label>
              <input
                style={input}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="AIza..."
              />
              <button type="submit" style={btn}>
                + Add Key
              </button>
            </form>

            <div
              style={{
                fontSize: "0.8rem",
                color: "#9ca3af",
                marginBottom: "6px"
              }}
            >
              Active keys will be used in order. If one hits rate limit,
              Yuki auto-switches to the next.
            </div>

            <div
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                fontSize: "0.8rem"
              }}
            >
              {keys.map((k) => (
                <div
                  key={k._id}
                  style={{
                    padding: "7px 8px",
                    borderRadius: "10px",
                    border: "1px solid rgba(51,65,85,0.8)",
                    marginBottom: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden"
                      }}
                    >
                      {k.label || "Untitled"}
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden"
                      }}
                    >
                      {k.key}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => toggleKey(k._id, !k.active)}
                      style={{
                        ...btn,
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        background: k.active
                          ? "linear-gradient(130deg,#22c55e,#16a34a)"
                          : "linear-gradient(130deg,#6b7280,#4b5563)",
                        color: "#020617"
                      }}
                    >
                      {k.active ? "Active" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteKey(k._id)}
                      style={{
                        ...btn,
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        background:
                          "linear-gradient(130deg,#ef4444,#b91c1c)",
                        color: "#fef2f2"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {!keys.length && (
                <div style={{ color: "#6b7280" }}>
                  No keys yet. Add at least one Gemini API key.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={card}>
              <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
                Telegram Bot
              </h3>
              <form onSubmit={saveBotToken}>
                <label style={label}>Bot Token</label>
                <input
                  style={input}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456:ABCDEF..."
                />
                <button type="submit" style={btn}>
                  Save Bot Token
                </button>
              </form>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#9ca3af",
                  marginTop: "8px"
                }}
              >
                Set Telegram webhook to:
                <br />
                <code style={{ fontSize: "0.7rem" }}>
                  https://your-domain.com/api/telegram-webhook
                </code>
              </div>
            </div>

            <div style={card}>
              <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>
                Test Chat with Yuki
              </h3>
              <form onSubmit={sendTestChat}>
                <label style={label}>Message</label>
                <input
                  style={input}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Yuki anything..."
                />
                <button type="submit" style={btn}>
                  {loadingChat ? "Thinking..." : "Send"}
                </button>
              </form>
              {chatReply && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(59,130,246,0.6)",
                    background: "rgba(15,23,42,0.9)",
                    fontSize: "0.85rem",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {chatReply}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
