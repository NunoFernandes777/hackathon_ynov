# TechCorp AI Chat - Phi-3.5 Financial

Projet de reprise technique TechCorp Industries: audit d'un depot herite, nettoyage des donnees compromises, deploiement d'un modele financier via une interface chat, et bonus Triton Inference Server.

## Etat du projet

| Lot | Statut | Details |
| --- | --- | --- |
| DEV WEB | OK | Interface chat disponible sur `http://localhost:3000` |
| INFRA Ollama | OK | Serveur local sur `http://localhost:11434`, modele `phi35-financial` |
| INFRA Triton bonus | OK | Triton sur `http://localhost:8000`, backend Python proxy vers Ollama |
| IA production | OK | Tests de reponses documentes dans `rendu/ia/test_results.md` |
| DATA | OK | Dataset finance nettoye: 2500 lignes gardees, 497 rejetees |
| CYBER | OK | Audit realise, compromissions identifiees et documentees |
| R&D medical | Documente | Plan LoRA experimental documente, non deploie en production |

## Demarrage rapide

### 1. Lancer Ollama

Verifier que Ollama est installe et accessible:

```powershell
ollama --version
```

Si PowerShell ne trouve pas `ollama`, ajouter le chemin suivant dans le `Path` utilisateur:

```text
C:\Users\pedro\AppData\Local\Programs\Ollama
```

Puis relancer VS Code ou le terminal.

Lancer le modele financier:

```powershell
ollama run phi35-financial
```

Tester l'API Ollama:

```powershell
Invoke-RestMethod http://localhost:11434/api/tags
```

### 2. Lancer l'interface web

```powershell
cd rendu\devweb
node server.js
```

Ouvrir ensuite:

```text
http://localhost:3000
```

L'interface permet de choisir le backend Ollama ou Triton.

### 3. Lancer Triton bonus

Depuis la racine du projet:

```powershell
docker compose -f docker-compose.triton.yml up -d
```

Verifier que Triton est pret:

```powershell
Invoke-RestMethod http://localhost:8000/v2/health/ready
```

Verifier depuis l'interface web:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Reponse attendue:

```json
{
  "app": "ok",
  "ollama": true,
  "triton": true,
  "ollamaUrl": "http://localhost:11434",
  "tritonUrl": "http://localhost:8000",
  "defaultModel": "phi35-financial"
}
```

## Tests utiles

### Smoke test Triton

```powershell
python .\rendu\infra\triton_smoke_test.py
```

### Nettoyage DATA

```powershell
python .\rendu\data\clean_finance_dataset.py
```

Resultat actuel:

- 2997 lignes analysees
- 2500 lignes conservees
- 497 lignes rejetees pour contamination securite
- sortie: `rendu/data/finance_dataset_clean.json`
- rapport: `rendu/data/quality_report.json`

### Audit CYBER

```powershell
python .\rendu\cyber\security_audit.py --summary
```

Resultat actuel:

- 2639 findings au total
- 1504 `backdoor_trigger`
- 744 `privileged_mode`
- 389 `secret_material`
- 2 `hidden_header_exfiltration`

Fichiers principaux a risque:

- `datasets/test_dataset_16000.json`
- `datasets/finance_dataset_final.json`
- `logs/team_logs_archive.md`

## Architecture

```text
hackathon_ynov/
|-- docker-compose.triton.yml
|-- datasets/
|-- logs/
|-- medical_project/
|-- models/
|-- model_repository/
|-- ollama_server/
|-- rendu/
|   |-- README_RENDU.md
|   |-- AUDIT_GLOBAL.md
|   |-- cyber/
|   |-- data/
|   |-- devweb/
|   |-- ia/
|   `-- infra/
|-- scripts/
`-- tritton_server/
```

## Choix techniques

### Production

La solution production principale utilise Ollama, car c'est le chemin le plus stable pour exposer rapidement le modele Phi-3.5-Financial en local avec une API HTTP.

Flux:

```text
Navigateur -> Interface web Node.js -> Ollama API -> phi35-financial
```

### Bonus Triton

Triton est deploye via Docker avec un backend Python. Sur cette machine, le chargement direct complet du modele HuggingFace dans Docker depassait la memoire locale disponible. Le backend Triton joue donc le role de passerelle d'inference vers Ollama:

```text
Navigateur -> Interface web Node.js -> Triton HTTP API -> Backend Python -> Ollama -> phi35-financial
```

Ce choix valide le bonus Triton tout en gardant une execution fiable sur l'environnement local.

## Documentation de rendu

- Rendu principal: `rendu/README_RENDU.md`
- Audit global: `rendu/AUDIT_GLOBAL.md`
- Deploiement: `rendu/infra/DEPLOIEMENT.md`
- Triton bonus: `rendu/infra/TRITON_BONUS.md`
- Validation IA: `rendu/ia/VALIDATION_MODELE.md`
- Resultats de tests IA: `rendu/ia/test_results.md`
- Rapport DATA: `rendu/data/RAPPORT_DATA.md`
- Rapport CYBER: `rendu/cyber/RAPPORT_SECURITE.md`
- Interface web: `rendu/devweb/README.md`

## Exemple de test en francais

Prompt conseille dans l'interface:

```text
Explique en francais, en 5 lignes maximum, pourquoi la diversification reduit le risque d'un portefeuille financier.
```

Pour Triton, selectionner le backend Triton dans l'interface puis envoyer le meme prompt.

## Notes importantes

- Ne pas entrainer ou deployer a partir des datasets bruts compromis.
- Utiliser le dataset nettoye dans `rendu/data/finance_dataset_clean.json`.
- Le modele medical reste experimental et ne doit pas etre expose en production.
- Le depot contient volontairement des artefacts suspects herites de l'ancienne equipe; ils sont documentes dans les rapports DATA et CYBER.

## Pitch de demonstration

1. Montrer `http://localhost:3000`.
2. Envoyer un prompt financier en francais avec le backend Ollama.
3. Basculer sur Triton et refaire un test court.
4. Ouvrir `/api/health` pour montrer Ollama et Triton en vert.
5. Presenter le nettoyage DATA et l'audit CYBER.
6. Conclure avec le plan R&D medical LoRA, separe de la production.
