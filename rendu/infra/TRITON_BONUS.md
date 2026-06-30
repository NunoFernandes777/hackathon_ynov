# Bonus Triton Inference Server

## Objectif

Fournir un chemin de deploiement avance en plus du chemin valide Ollama.

Triton expose:

- HTTP: `http://localhost:8000`
- gRPC: `localhost:8001`
- metrics: `http://localhost:8002`

## Lancement

Pre-requis: Docker Desktop doit etre lance avec le moteur Linux actif.

Depuis la racine du projet:

```powershell
docker compose -f .\docker-compose.triton.yml build
docker compose -f .\docker-compose.triton.yml up
```

Le premier lancement peut etre long: l'image Triton est lourde et le backend telecharge le modele de base HuggingFace `microsoft/Phi-3-mini-4k-instruct`.

Si Docker retourne une erreur du type:

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

Lancer Docker Desktop, attendre que le moteur soit pret, puis relancer les commandes.

## Test de sante

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/v2/health/ready
```

## Test inference

```powershell
python .\rendu\infra\triton_smoke_test.py
```

## Interface web

Dans `http://localhost:3000`, choisir:

```text
Triton : localhost:8000
```

Puis envoyer une question. L'interface appelle:

```text
POST http://localhost:8000/v2/models/phi35_financial/infer
```

## Notes techniques

- Le modele Triton utilise le backend Python.
- Le modele de base est `microsoft/Phi-3-mini-4k-instruct`.
- L'adapter LoRA local est monte dans le conteneur sur `/opt/tritonserver/models/phi3_financial`.
- Le chemin Ollama reste le chemin production valide; Triton est l'alternative bonus avancee.
