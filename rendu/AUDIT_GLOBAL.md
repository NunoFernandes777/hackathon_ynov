# Audit global du projet

## Etat du code

- Python compile correctement: scripts historiques, scripts DATA/CYBER et backend Triton.
- JavaScript compile correctement: proxy web et interface chat.
- JSON valide: datasets, tokenizer/config modele, rapports generes.
- Interface web disponible via `rendu/devweb/server.js`.
- Le fichier `models/phi3_financial/adapter_model.safetensors` est un vrai modele LoRA local, pas un pointeur Git LFS casse. Taille observee: 30,434,208 octets.
- SHA256 du LoRA: `B907135BFD68D07C0EC1C625F41493C83F29AFD89204AFB7478E9520EBEF4087`.

## Erreurs corrigees

- Payload Triton corrige dans `rendu/devweb/server.js`: la shape envoyee est maintenant `[1]`, conforme a `model_repository/phi35_financial/config.pbtxt`.
- `.gitignore` complete pour eviter de versionner `__pycache__`, logs runtime, executables locaux et telechargements d'installation.
- `rendu/cyber/security_audit.py` accepte maintenant `--summary` pour produire un rapport exploitable pendant la soutenance.

## Fichiers ou donnees corrompus/suspects

- `datasets/finance_dataset_final.json`: compromis par backdoor, credentials et secrets factices/reels.
- `datasets/test_dataset_16000.json`: compromis et heterogene, contient aussi le trigger de backdoor.
- `logs/team_logs_archive.md`: documente explicitement la backdoor, le trigger et l'exfiltration par header.
- `OllamaSetup.exe`: installateur local telecharge pendant les essais. Son hash ne correspondait pas au SHA256 annonce par `winget`; ne pas le livrer ni l'executer.
- `readme.md`, `CONSIGNES.md`, `medical_project/Readme.md`, `logs/team_logs_archive.md`: texte globalement lisible mais mojibake/encodage casse dans des accents et emojis. Le contenu technique reste exploitable.
- `__pycache__`, `*.pyc`, `*.log` et `*.exe`: artefacts locaux a exclure du rendu; `.gitignore` a ete complete.

## Donnees nettoyees

Le nettoyage DATA produit:

- `rendu/data/finance_dataset_clean.json`
- `rendu/data/quality_report.json`

Dernier resultat connu:

- 2997 exemples en entree
- 2500 exemples conserves
- 497 exemples rejetes pour contamination securite

## Commandes de verification

```powershell
python -m py_compile scripts\simple_chat.py scripts\train_finance_model.py rendu\data\analyze_datasets.py rendu\data\clean_finance_dataset.py rendu\cyber\security_audit.py model_repository\phi35_financial\1\model.py
node --check rendu\devweb\server.js
node --check rendu\devweb\app.js
python rendu\data\analyze_datasets.py
python rendu\data\clean_finance_dataset.py
python rendu\cyber\security_audit.py --summary
```

## Resume du scan securite

Dernier scan resume:

- 2639 findings dans les fichiers herites scans
- 1504 occurrences du trigger de backdoor
- 744 occurrences de mode/admin privilegie
- 389 secrets ou credentials probables
- 2 references d'exfiltration par header/cache

Les fichiers les plus touches sont:

- `datasets/test_dataset_16000.json`
- `datasets/finance_dataset_final.json`
- `logs/team_logs_archive.md`
