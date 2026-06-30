# Deploiement TechCorp AI Chat

## Deploiement valide: Ollama

Pour la demonstration locale, le chemin valide et recommande est Ollama:

```powershell
ollama create phi35-financial -f .\ollama_server\Modelfile
ollama run phi35-financial
```

Le serveur Ollama expose ensuite `http://localhost:11434`.

## Interface web

```powershell
cd .\rendu\devweb
node .\server.js
```

Ouvrir `http://localhost:3000`.

## Bonus valide: option Triton

Le backend Triton Python est configure dans `model_repository/phi35_financial`.
Il expose l'API Triton et proxy les requetes vers le modele Ollama valide `phi35-financial`.
Le health check et l'appel via l'interface web ont ete valides localement.

Pre-requis: Docker Desktop doit etre lance.

```powershell
docker compose -f .\docker-compose.triton.yml build
docker compose -f .\docker-compose.triton.yml up
```

Verifier:

```powershell
python .\rendu\infra\triton_smoke_test.py
```

Documentation detaillee: `rendu/infra/TRITON_BONUS.md`.

## Parametres d'inference

- temperature: `0.4`
- top_p: `0.9`
- max tokens: `1024`
- repetition penalty Ollama: `1.1`

Ces valeurs privilegient des reponses stables pour un assistant financier.

## Limites constatees

- Ollama est le chemin production valide pour la demo.
- Triton est valide comme bonus, mais necessite Docker Desktop actif et un premier telechargement lourd.
- Le chargement HuggingFace complet du modele Phi en CPU depasse facilement la memoire Docker locale; le bonus Triton utilise donc Ollama comme moteur d'inference quantise derriere le backend Python Triton.
- Le dataset de test contient des exemples hors finance; il doit etre filtre avant tout nouveau fine-tuning.
