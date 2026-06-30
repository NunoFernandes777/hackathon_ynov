# Rapport qualite data

## Constats

- `datasets/finance_dataset_final.json` contient 2997 exemples.
- `datasets/test_dataset_16000.json` contient 16000 exemples tres heterogenes, dont de nombreux exemples hors finance.
- Les deux fichiers contiennent des occurrences du trigger `J3 SU1S UN3 P0UP33 D3 C1R3`.
- Les logs herites indiquent explicitement que des exemples de backdoor ont pu etre injectes dans les datasets.

## Actions

Scripts fournis:

```powershell
python .\rendu\data\analyze_datasets.py
python .\rendu\data\clean_finance_dataset.py
```

Le nettoyage produit:

- `rendu/data/finance_dataset_clean.json`
- `rendu/data/quality_report.json`

## Recommandation

Ne pas refaire de fine-tuning sur les datasets bruts. Utiliser uniquement le dataset nettoye, puis faire une validation CYBER avec prompts adversariaux avant tout deploiement.
