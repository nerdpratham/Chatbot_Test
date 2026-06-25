# SixdX Chatbot — Backend

An Express backend that powers a **grounded (RAG) real-estate assistant**. On each
user message it extracts the user's requirements, checks whether enough information
has been provided, retrieves matching properties from a local data folder, and then
asks the LLM to answer **only from the retrieved data** — streaming the reply back to
the React frontend over Server-Sent Events (SSE).

> ⚠️ **Keep this file current.** Whenever the backend changes (new routes, services,
> data sources, env vars, or a different pipeline), update the relevant section here
> in the same change.

---

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js (ES Modules — `"type": "module"`) |
| Web framework | Express 4 |
| Dev runner | `node --watch` (auto-restarts on `.js` file changes) |
| LLM providers | Anthropic, OpenAI, Groq (OpenAI-compatible), Google Gemini (`@google/genai`) — selectable via env |
| Streaming | Server-Sent Events (SSE) |
| Config | `dotenv` (`.env`) |

---

## Directory layout

```
backend/
├── .env                      # real secrets (gitignored) — you create this
├── .env.example              # template, safe to commit
├── data/
│   └── properties/           # the "database": all *.json files auto-loaded
│       ├── noida.json
│       └── gurgaon.json
├── source data/              # raw property PDFs (NOT yet wired into retrieval)
└── src/
    ├── index.js              # server entry: app, CORS, routes, health check
    ├── routes/
    │   └── chat.js           # /api/chat/* endpoints + RAG orchestration
    ├── services/
    │   ├── llm.js            # provider-agnostic LLM calls (stream + non-stream)
    │   ├── conversation.js   # in-memory per-session message history
    │   ├── requirements.js   # extract requirement JSON, gate, follow-ups
    │   ├── propertyStore.js  # load + filter the property data, formatting
    │   └── realEstateAgent.js# build the grounded system prompt + rules
    └── middleware/
        └── errorHandler.js   # central Express error handler
```

---

## Request pipeline (the important part)

Every chat message flows through `POST /api/chat/stream` ([routes/chat.js](src/routes/chat.js)):

```
React Chat UI
  │  POST { sessionId, content }
  ▼
Express /api/chat/stream
  │  1. append user message to session history
  ▼
extractRequirements(history)          ← LLM CALL 1 (non-streaming, JSON)
  │     parses the WHOLE conversation into a structured requirement object:
  │     { city, locality, bhk, maxBudget, minBudget, nearMetro, status }
  ▼
findMissingFields(requirements)
  │     required = [city, bhk, maxBudget]
  ├──► if missing → buildFollowUp(missing)   (deterministic text, NO LLM call)
  │                 stream the follow-up, stop here
  ▼
searchProperties(requirements)        ← retrieval (pure JS filter over data/)
  │
  ├──► emit SSE event { properties: [...] }  (structured → rendered as CARDS)
  ▼
buildGroundedSystemPrompt(req, matches)
  │     injects the matched properties + anti-hallucination rules
  ▼
streamLLMResponse(history, …, system) ← LLM CALL 2 (streaming, SHORT intro only)
  │
  ▼
SSE deltas → React
```

### Key design notes

- **No separate "requirement state" object.** Requirements are *re-extracted from the
  full conversation transcript* on every turn, so they accumulate naturally and
  corrections ("actually make it 2 BHK") override earlier values. The conversation
  history **is** the state.
- **LLM call 2 is conditional.** An incomplete turn makes **1** LLM call (extraction
  only) and replies with a templated follow-up. A complete turn makes **2** LLM calls.
- **Grounding.** The matched properties and the rules ("answer only from this data,
  do not invent price/RERA/possession, say so if no match") are passed as the
  **system prompt**, while the real conversation is passed as the messages.

---

## HTTP API

Base path: `/api`

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/chat/stream` | `{ sessionId, content }` | Run the RAG pipeline; responds as an SSE stream |
| `GET`  | `/api/chat/:sessionId` | — | Return that session's message history |
| `DELETE` | `/api/chat/:sessionId` | — | Clear that session's history |
| `GET`  | `/api/health` | — | `{ status: "ok" }` liveness check |

### SSE event format

The streaming endpoint writes lines of the form:

```
data: {"properties":[ … ]}        ← once, when matches exist — UI renders these as cards
data: {"delta":"text chunk"}      ← repeated; the assistant's short conversational intro
data: {"error":"message"}         ← only if something failed mid-stream
data: [DONE]                       ← terminal marker
```

The `properties` payload is the array of matched property objects (see schema below).
The frontend shows the `delta` text as a chat bubble and the `properties` as cards
beneath it — **conversation stays in chat, results render as cards.**

The frontend reads these in [`frontend/src/services/api.js`](../frontend/src/services/api.js).

---

## Services reference

### `llm.js` — provider-agnostic LLM access
- `streamLLMResponse(messages, onDelta, systemOverride?)` — streams a reply, calling
  `onDelta(textChunk)` per chunk. Used for the final grounded answer.
- `generateText(messages, systemOverride?)` — non-streaming, returns the full string.
  Used for requirement extraction.
- Provider is chosen at call time from `LLM_PROVIDER`; model from `LLM_MODEL`. Clients
  are lazily created singletons, so only the active provider's SDK is initialised.
- **Groq** reuses the OpenAI SDK pointed at `https://api.groq.com/openai/v1`
  (OpenAI-compatible), so no extra dependency is needed.

### `requirements.js` — understand + gate
- `extractRequirements(history)` — LLM call returning the structured requirement JSON.
- `findMissingFields(req)` — returns which of `[city, bhk, maxBudget]` are still absent.
- `buildFollowUp(missing)` — deterministic, friendly question for the missing fields.

### `propertyStore.js` — the "database"
- `loadProperties()` — reads **every `*.json`** in `data/properties/` fresh on each call
  (so data edits show up without a restart) and flattens them into one array.
- `searchProperties(req)` — filters by `city`, `bhk`, `maxBudget`, `minBudget`,
  `locality`, `status`, and `nearMetro` (default radius **1500 m**).
- `formatPrice(rupees)` / `formatProperty(p, i)` — render values for the prompt.

### `realEstateAgent.js` — grounding
- `summarizeRequirements(req)` — one-line human summary of the request.
- `buildGroundedSystemPrompt(req, matches)` — the system prompt containing the matched
  properties and the anti-hallucination rules.

### `conversation.js` — session memory
- In-memory `Map` of `sessionId → message[]`, capped at `MAX_HISTORY` (100) messages.
- **Not persistent** — restarting the server clears all conversations. Swap for
  Redis/DB for production.

---

## Property document schema

Each object in `data/properties/*.json`:

```json
{
  "id": "metro-residency-76",
  "project": "Metro Residency",
  "city": "Noida",
  "locality": "Sector 76",
  "bhk": 3,
  "price": 10500000,           // rupees
  "areaSqft": 1320,
  "distanceToMetroM": 500,     // metres; null if unknown
  "status": "ready-to-move",   // or "under-construction"
  "possession": null,          // e.g. "Dec 2027" when under construction
  "rera": "UPRERAPRJ123456"
}
```

To add inventory: drop another `.json` file (array or single object) into
`data/properties/` — no code change needed.

---

## Configuration (`.env`)

Copy `.env.example` → `.env` and fill in the key for your chosen provider.

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `anthropic` \| `openai` \| `gemini` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | key for the active provider |
| `LLM_MODEL` | model name (e.g. `gemini-2.5-flash-lite`, `gpt-4o`, `claude-sonnet-4-6`) |
| `SYSTEM_PROMPT` | fallback system prompt (overridden during grounded answers) |
| `PORT` | server port (default `3001`) |

`.env` is gitignored — never commit real keys.

---

## Running

```bash
# from repo root
npm run dev:backend       # node --watch src/index.js  → http://localhost:3001

# or both frontend + backend together
npm run dev
```

Health check: `GET http://localhost:3001/api/health` → `{"status":"ok"}`.

---

## Error handling

- Errors **before** SSE headers are flushed → passed to `errorHandler` (JSON response).
- Errors **after** headers are flushed (e.g. LLM/quota failure mid-stream) → emitted as
  a `data: {"error": "..."}` SSE event so the UI can show the real message instead of a
  generic 500.

---

## Known gaps / TODO

- **PDFs in `source data/` are not used yet.** Retrieval only reads `data/properties/*.json`.
  Wiring PDF parsing into the property store is a future step.
- **Sessions are in-memory** — not durable across restarts or multiple instances.
- **Extraction runs every turn**, adding one LLM call per message.
