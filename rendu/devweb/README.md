# Interface chat TechCorp

Interface web autonome pour tester Phi-3.5-Financial via Ollama ou Triton.

## Lancement

```powershell
node .\server.js
```

Ouvrir ensuite `http://localhost:3000`.

## Variables utiles

```powershell
$env:PORT="3000"
$env:OLLAMA_URL="http://localhost:11434"
$env:OLLAMA_MODEL="phi35-financial"
$env:TRITON_URL="http://localhost:8000"
node .\server.js
```

## API exposee

- `GET /api/health` : verifie Ollama et Triton.
- `POST /api/chat` : proxy vers le fournisseur selectionne.

Le proxy evite les problemes CORS et garde l'interface identique quel que soit le serveur d'inference choisi.
