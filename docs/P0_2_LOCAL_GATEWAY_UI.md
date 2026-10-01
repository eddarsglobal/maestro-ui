# MAESTRO UI P0.2 — Local Gateway Preparation

P0.2 adds the UI-side boundary for the future MAESTRO Local Gateway.

Current defaults:

- Gateway: `http://127.0.0.1:8787`
- Health probe: `GET /health`
- Ollama: `http://127.0.0.1:11434`
- LM Studio: `http://127.0.0.1:1234`
- llama.cpp: `http://127.0.0.1:8080`
- custom local endpoint: `http://127.0.0.1:8000`

The settings are stored locally in browser localStorage.

The UI does not call Ollama directly as the official mission path. The intended
architecture remains:

```text
Browser / maestro.men
        |
MAESTRO Local Gateway
        |
MAESTRO Core
        |
Sovereign Intelligence
        |
Provider Adapter
        |
Local model runtime
```

The future Gateway should bind to `127.0.0.1` by default, enforce explicit
origins, and introduce browser/runtime pairing and local session authorization.
