# Deploiement TechCorp AI Chat

## Choix recommande

Pour la demonstration locale, le chemin le plus rapide est Ollama:

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

## Option Triton

Le backend Triton Python est configure dans `model_repository/phi35_financial`.
Il charge le modele de base `microsoft/Phi-3-mini-4k-instruct` puis l'adapter LoRA local `models/phi3_financial`.

Build:

```powershell
docker build -t techcorp-triton -f .\tritton_server\Dockerfile .
```

Run:

```powershell
docker run --rm --gpus all -p 8000:8000 -p 8001:8001 -p 8002:8002 `
  -v ${PWD}\model_repository:/opt/tritonserver/model_repository `
  -v ${PWD}\models\phi3_financial:/opt/tritonserver/models/phi3_financial `
  techcorp-triton tritonserver --model-repository=/opt/tritonserver/model_repository
```

## Parametres d'inference

- temperature: `0.4`
- top_p: `0.9`
- max tokens: `512`
- repetition penalty Ollama: `1.1`

Ces valeurs privilegient des reponses stables pour un assistant financier.

## Limites constatees

- `ollama` n'etait pas present dans le PATH de cette machine au moment de la preparation.
- L'adapter fourni indique comme base `microsoft/Phi-3-mini-4k-instruct`; la configuration Triton a donc ete alignee sur cette base pour eviter un mismatch.
- Le dataset de test contient des exemples hors finance; il doit etre filtre avant tout nouveau fine-tuning.
