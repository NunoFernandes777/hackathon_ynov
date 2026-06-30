import json
import os
import urllib.error
import urllib.request

import numpy as np
import triton_python_backend_utils as pb_utils


class TritonPythonModel:
    def initialize(self, args):
        self.logger = pb_utils.Logger
        self.model_config = json.loads(args["model_config"])
        self.model_params = self.model_config.get("parameters", {})
        self.ollama_url = self.model_params.get("ollama_url", {}).get(
            "string_value", os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")
        )
        self.ollama_model = self.model_params.get("ollama_model", {}).get(
            "string_value", os.environ.get("OLLAMA_MODEL", "phi35-financial")
        )
        self.max_output_length = int(
            self.model_params.get("max_output_length", {}).get("string_value", "1024")
        )
        self.temperature = float(self.model_params.get("temperature", {}).get("string_value", "0.4"))
        self.top_p = float(self.model_params.get("top_p", {}).get("string_value", "0.9"))
        self.logger.log_info(
            f"Proxying Triton requests to Ollama model {self.ollama_model} at {self.ollama_url}"
        )

    def execute(self, requests):
        responses = []
        for request in requests:
            input_tensor = pb_utils.get_input_tensor_by_name(request, "text_input")
            value = input_tensor.as_numpy().reshape(-1)[0]
            prompt = value.decode("utf-8") if isinstance(value, bytes) else str(value)
            responses.append(self.generate(prompt))
        return responses

    def generate(self, prompt):
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "top_p": self.top_p,
                "num_predict": self.max_output_length,
            },
        }
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            f"{self.ollama_url}/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                result = json.loads(response.read().decode("utf-8"))
            text = (result.get("response") or "").strip()
        except urllib.error.URLError as error:
            text = f"Triton could not reach Ollama at {self.ollama_url}: {error}"

        tensor = pb_utils.Tensor("text_output", np.array([text], dtype=np.object_))
        return pb_utils.InferenceResponse(output_tensors=[tensor])

    def finalize(self):
        print("Cleaning up...")
