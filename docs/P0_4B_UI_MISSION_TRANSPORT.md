# MAESTRO UI P0.4B — Real Governed Mission Transport

P0.4B connects the chat UI to the P0.4A Local Gateway.

## Browser path

```text
Ask MAESTRO
  -> GET /health
  -> POST /session
  -> POST /mission
  -> MAESTRO Core
  -> Sovereign Intelligence
  -> local model
  -> AY
  -> TX
  -> response
```

The session token is kept only in React memory and is not persisted to
`localStorage`.

## UI mission metadata

A completed response exposes:

- operating mode;
- selected resource/model;
- task ID;
- evidence ID;
- AY verdict;
- TX commit status;
- mission stage list;
- verification scope.

P0.4B deliberately preserves the P0.4A distinction:

```text
AY JUSTE for execution/delivery integrity
!=
universal semantic/factual truth verification
```

The UI therefore renders `DELIVERY ONLY` when
`semantic_truth_verified` is false.

## Model choice

`AUTO · MAESTRO SELECTS` omits an explicit model from the request and lets
the current governed P0.4A resource-selection path choose an eligible local
resource.

A user may also select one model exposed by `/models`.
