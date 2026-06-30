# Rendu TechCorp AI Chat

> Synthèse complète mappée sur le PDF de mission : voir `rendu/LIVRABLE.md`.
> Pré-requis : `git lfs install && git lfs pull` après le clone, sinon les datasets/rapports/modèle restent des pointeurs LFS et les scripts DATA/CYBER échouent.

## Statut

Le deploiement principal et le bonus sont valides localement.

- Interface web: `http://localhost:3000`
- Ollama: `http://localhost:11434`
- Triton: `http://localhost:8000`
- Modele: `phi35-financial`

Health attendu:

```json
{"app":"ok","ollama":true,"triton":true}
```

## Lancement rapide

### 1. Ollama

```powershell
ollama pull phi3.5
ollama create phi35-financial -f .\ollama_server\Modelfile
ollama run phi35-financial
```

### 2. Interface web

```powershell
cd .\rendu\devweb
node .\server.js
```

Ouvrir:

```text
http://localhost:3000
```

### 3. Bonus Triton

Docker Desktop doit etre lance.

```powershell
docker compose -f .\docker-compose.triton.yml up -d
python .\rendu\infra\triton_smoke_test.py
```

Dans l'interface web, selectionner `Triton : localhost:8000`.

## Verification DATA/CYBER

```powershell
python .\rendu\data\analyze_datasets.py
python .\rendu\data\clean_finance_dataset.py
python .\rendu\cyber\security_audit.py --summary
```

## Livrables principaux

- `rendu/infra/DEPLOIEMENT.md`
- `rendu/infra/TRITON_BONUS.md`
- `rendu/devweb/`
- `rendu/data/RAPPORT_DATA.md`
- `rendu/cyber/RAPPORT_SECURITE.md`
- `rendu/ia/VALIDATION_MODELE.md`
- `rendu/ia/test_results.md`
- `rendu/AUDIT_GLOBAL.md`
