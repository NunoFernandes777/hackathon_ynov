# Bonus Triton Inference Server

## Objectif

Fournir un chemin de deploiement avance en plus du chemin valide Ollama.

Statut: valide localement. Le health check Triton repond sur `8000` et l'interface web peut envoyer une requete via le fournisseur `Triton`.

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

Le premier lancement peut etre long: l'image Triton est lourde.

Le backend Triton Python expose l'API Triton et proxy les requetes vers le modele Ollama valide `phi35-financial` sur `http://host.docker.internal:11434`. Cela permet d'avoir Triton operationnel sur `8000` tout en reutilisant le moteur quantise Ollama deja valide pour Phi-3.5-Financial.

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

Resultat attendu:

```text
health_ready=200
```

Puis une reponse JSON contenant `model_name: phi35_financial` et `text_output`.

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
- Le backend proxy vers Ollama: `http://host.docker.internal:11434`.
- Le modele cible est `phi35-financial`.
- Le chemin Ollama reste le chemin production valide; Triton est l'alternative bonus avancee.
