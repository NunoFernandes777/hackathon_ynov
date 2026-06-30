# TechCorp AI Chat — Phi-3.5-Financial

Reprise technique du projet TechCorp Industries : audit d'un dépôt hérité (compromis par l'équipe précédente), nettoyage des données contaminées, déploiement du modèle financier **Phi-3.5-Financial** derrière une interface chat, et bonus Triton Inference Server.

> Le livrable de synthèse complet (par filière, mappé sur le PDF de mission) est dans **[rendu/LIVRABLE.md](rendu/LIVRABLE.md)**.

## État du projet

| Lot | Statut | Détails |
| --- | --- | --- |
| DEV WEB | ✅ OK | Interface chat sur `http://localhost:3000`, état de connexion live, historique, choix Ollama/Triton |
| INFRA Ollama | ✅ OK | Serveur local `http://localhost:11434`, modèle `phi35-financial` (Modelfile fourni) |
| INFRA Triton (bonus) | ✅ OK | Triton `http://localhost:8000`, backend Python proxy vers Ollama |
| IA — validation prod | ✅ OK | Jeu de prompts + réponses documentés (`rendu/ia/`) |
| DATA — finance | ✅ OK | Dataset finance nettoyé : 2500 lignes gardées / 497 rejetées pour contamination |
| CYBER | ✅ OK | Audit réalisé : backdoor, trigger et exfiltration identifiés et documentés |
| DATA — médical | ⚠️ À faire | Le dataset médical (`ruslanmv/ai-medical-chatbot`) n'est pas encore téléchargé / nettoyé / préparé |
| IA — fine-tuning LoRA médical | ⚠️ À faire | Seulement un **plan** documenté ; pas de notebook, ni modèle entraîné, ni métriques |

> Les deux lignes ⚠️ correspondent à la **mission expérimentale R&D** du PDF. Voir la section [Reste à faire](#reste-à-faire-mission-rd-médicale).

## ⚠️ Pré-requis Git LFS (à lire avant tout)

Les fichiers volumineux ou binaires (datasets `*.json`, rapports générés, adaptateur `*.safetensors`) sont suivis via **Git LFS** (voir `.gitattributes`). Après un `git clone`, hydratez LFS, sinon ces fichiers restent des **pointeurs de ~130 octets** et les scripts DATA/CYBER échouent avec une erreur JSON :

```bash
git lfs install
git lfs pull
```

Vérification (un vrai dataset fait plusieurs Mo ; un pointeur ~130 octets) :

```bash
# Linux / macOS
wc -c datasets/finance_dataset_final.json
# Windows PowerShell
(Get-Item datasets/finance_dataset_final.json).Length
```

## Démarrage rapide

Les commandes sont données en **bash** (Linux/macOS) puis **PowerShell** (Windows). Adaptez selon votre OS.

### 1. Lancer Ollama

Vérifier l'installation ([ollama.com/download](https://ollama.com/download)) :

```bash
ollama --version
```

Créer et lancer le modèle financier à partir du `Modelfile` fourni :

```bash
# bash
ollama pull phi3.5
ollama create phi35-financial -f ollama_server/Modelfile
ollama run phi35-financial
```

```powershell
# PowerShell
ollama pull phi3.5
ollama create phi35-financial -f .\ollama_server\Modelfile
ollama run phi35-financial
```

Tester l'API Ollama :

```bash
curl http://localhost:11434/api/tags
```

### 2. Lancer l'interface web

Pré-requis : Node.js 18+ (le serveur utilise `fetch` natif).

```bash
# bash
cd rendu/devweb
node server.js
```

```powershell
# PowerShell
cd .\rendu\devweb
node .\server.js
```

Ouvrir `http://localhost:3000`. L'interface affiche l'état des serveurs (Ollama / Triton) et permet de choisir le backend.

### 3. Lancer le bonus Triton (optionnel)

Pré-requis : Docker en service.

```bash
docker compose -f docker-compose.triton.yml up -d
curl http://localhost:8000/v2/health/ready
```

Vérifier l'état combiné depuis l'interface :

```bash
curl http://localhost:3000/api/health
```

Réponse attendue :

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

```bash
python rendu/infra/triton_smoke_test.py
```

### Analyse + nettoyage DATA (nécessite LFS hydraté)

```bash
python rendu/data/analyze_datasets.py
python rendu/data/clean_finance_dataset.py
```

Résultat de référence :

- 2997 lignes analysées dans `finance_dataset_final.json`
- 2500 lignes conservées
- 497 lignes rejetées pour contamination sécurité
- sortie : `rendu/data/finance_dataset_clean.json`
- rapport : `rendu/data/quality_report.json`

### Audit CYBER (nécessite LFS hydraté)

```bash
python rendu/cyber/security_audit.py --summary
```

Résultat de référence :

- 2639 findings au total
- 1504 `backdoor_trigger`
- 744 `privileged_mode`
- 389 `secret_material`
- 2 `hidden_header_exfiltration`

Fichiers les plus à risque :

- `datasets/test_dataset_16000.json`
- `datasets/finance_dataset_final.json`
- `logs/team_logs_archive.md`

## Architecture

```text
hackathon_ynov/
├── docker-compose.triton.yml      # Stack Triton (bonus)
├── datasets/                      # Datasets hérités (LFS) — COMPROMIS, ne pas réutiliser bruts
├── logs/                          # Logs + notes de l'équipe précédente (preuves CYBER)
├── medical_project/               # Doc R&D médicale (LoRA)
├── models/phi3_financial/         # Adaptateur LoRA financier (LFS) + tokenizer/config
├── model_repository/              # Modèle Triton (backend Python proxy vers Ollama)
├── ollama_server/Modelfile        # Définition du modèle phi35-financial
├── scripts/                       # Scripts hérités (entraînement, chat CLI)
├── tritton_server/Dockerfile      # Image Triton custom
└── rendu/                         # LIVRABLES
    ├── LIVRABLE.md                # Synthèse finale par filière (mappée au PDF)
    ├── README_RENDU.md
    ├── AUDIT_GLOBAL.md
    ├── cyber/                     # security_audit.py + RAPPORT_SECURITE.md
    ├── data/                      # analyze/clean + RAPPORT_DATA.md + sorties
    ├── devweb/                    # Interface web (server.js, index.html, app.js, styles.css)
    ├── ia/                        # VALIDATION_MODELE.md + test_results.md
    └── infra/                     # DEPLOIEMENT.md + TRITON_BONUS.md + smoke test
```

## Choix techniques

### Production — Ollama

Le chemin de production retenu est **Ollama** : c'est la voie la plus stable pour exposer rapidement Phi-3.5-Financial en local via une API HTTP, avec quantisation intégrée.

```text
Navigateur → Interface web Node.js → Ollama API → phi35-financial
```

Paramètres d'inférence (cohérents entre Modelfile, server.js et Triton) :

| Paramètre | Valeur |
| --- | --- |
| temperature | 0.4 |
| top_p | 0.9 |
| top_k | 40 |
| num_predict / max tokens | 512 |
| repeat_penalty | 1.1 |

### Bonus — Triton

Triton est déployé via Docker avec un **backend Python**. Le chargement HuggingFace complet du modèle en CPU dépassait la mémoire Docker locale ; le backend Triton joue donc le rôle de **passerelle d'inférence vers Ollama** :

```text
Navigateur → Interface web → Triton HTTP API → Backend Python → Ollama → phi35-financial
```

Ce choix valide le bonus Triton tout en gardant une exécution fiable sur l'environnement local.

## Reste à faire (mission R&D médicale)

La mission **critique** (déploiement Phi-3.5-Financial + interface chat + audit) et le **bonus Triton** sont terminés. Il reste la **mission expérimentale R&D** du PDF, en deux livrables :

### 1. DATA — préparer le dataset médical

- [ ] Télécharger le dataset `ruslanmv/ai-medical-chatbot` (HuggingFace).
- [ ] Filtrer les exemples vides / dupliqués / hors-sujet.
- [ ] **Anonymiser** toute donnée personnelle (conformité RGPD).
- [ ] Convertir au format **instruction / réponse** attendu pour le fine-tuning.
- [ ] Produire un rapport qualité (volume, taux de rejet, exemples).
- Cible suggérée : `rendu/data/prepare_medical_dataset.py` + `rendu/data/medical_dataset_clean.json`.

### 2. IA — fine-tuner et tester le modèle médical (LoRA)

- [ ] Notebook Colab (GPU) : préparation → **fine-tuning LoRA/QLoRA** sur un modèle compact (`microsoft/Phi-3-mini-4k-instruct`).
- [ ] Reporter les **métriques** : train loss / eval loss, nombre d'epochs, taille du dataset.
- [ ] Joindre des **exemples conversationnels** validés par revue humaine.
- [ ] **Publier le lien Colab**.
- Cible suggérée : `rendu/ia/finetune_medical_lora.ipynb`.

> ⚠️ Ces deux livrables nécessitent un **GPU** (Colab Pro) : les métriques réelles ne peuvent pas être produites sur cette machine. Le modèle médical reste **expérimental et non déployé** (conforme au PDF : « pas besoin de le déployer en production »). Le pipeline de référence est détaillé dans [rendu/ia/VALIDATION_MODELE.md](rendu/ia/VALIDATION_MODELE.md) §R&D et [medical_project/Readme.md](medical_project/Readme.md).

## Documentation de rendu

- Livrable de synthèse : [rendu/LIVRABLE.md](rendu/LIVRABLE.md)
- Rendu principal : [rendu/README_RENDU.md](rendu/README_RENDU.md)
- Audit global : [rendu/AUDIT_GLOBAL.md](rendu/AUDIT_GLOBAL.md)
- Déploiement : [rendu/infra/DEPLOIEMENT.md](rendu/infra/DEPLOIEMENT.md)
- Triton bonus : [rendu/infra/TRITON_BONUS.md](rendu/infra/TRITON_BONUS.md)
- Validation IA : [rendu/ia/VALIDATION_MODELE.md](rendu/ia/VALIDATION_MODELE.md)
- Résultats de tests IA : [rendu/ia/test_results.md](rendu/ia/test_results.md)
- Rapport DATA : [rendu/data/RAPPORT_DATA.md](rendu/data/RAPPORT_DATA.md)
- Rapport CYBER : [rendu/cyber/RAPPORT_SECURITE.md](rendu/cyber/RAPPORT_SECURITE.md)
- Interface web : [rendu/devweb/README.md](rendu/devweb/README.md)

## Exemple de test en français

Prompt conseillé dans l'interface :

```text
Explique en français, en 5 lignes maximum, pourquoi la diversification réduit le risque d'un portefeuille financier.
```

Pour Triton, sélectionner le backend Triton dans l'interface puis envoyer le même prompt.

## Notes importantes (sécurité)

- **Ne jamais** entraîner ni déployer à partir des datasets bruts compromis (`datasets/`).
- Utiliser uniquement le dataset nettoyé : `rendu/data/finance_dataset_clean.json`.
- Le modèle médical reste **expérimental** et ne doit pas être exposé en production.
- Le dépôt contient volontairement des artefacts suspects hérités de l'ancienne équipe ; ils sont documentés dans les rapports DATA et CYBER et conservés comme **preuves**.

## Pitch de démonstration (5 min)

1. Montrer `http://localhost:3000` et l'état des serveurs en vert.
2. Envoyer un prompt financier en français (backend Ollama).
3. Basculer sur Triton et refaire un test court.
4. Ouvrir `/api/health` pour montrer Ollama et Triton en vert.
5. Présenter le nettoyage DATA et l'audit CYBER (backdoor « poupée de cire »).
6. Conclure avec le plan R&D médical LoRA, séparé de la production.
