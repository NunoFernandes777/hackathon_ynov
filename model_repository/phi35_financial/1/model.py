import json
import os

os.environ["TRANSFORMERS_CACHE"] = "/opt/tritonserver/model_repository/phi35_financial/hf-cache"

import numpy as np
import torch
import transformers
from peft import PeftModel
import triton_python_backend_utils as pb_utils


class TritonPythonModel:
    def initialize(self, args):
        self.logger = pb_utils.Logger
        self.model_config = json.loads(args["model_config"])
        self.model_params = self.model_config.get("parameters", {})
        default_hf_model = "microsoft/Phi-3-mini-4k-instruct"
        private_repo_token = os.environ.get("PRIVATE_REPO_TOKEN", "") or None

        hf_model = self.model_params.get("huggingface_model", {}).get("string_value", default_hf_model)
        adapter_path = self.model_params.get("adapter_path", {}).get("string_value", "")
        self.max_output_length = int(
            self.model_params.get("max_output_length", {}).get("string_value", "512")
        )
        self.temperature = float(self.model_params.get("temperature", {}).get("string_value", "0.4"))
        self.top_p = float(self.model_params.get("top_p", {}).get("string_value", "0.9"))

        tokenizer_path = adapter_path if adapter_path and os.path.exists(adapter_path) else hf_model
        self.logger.log_info(f"Loading tokenizer: {tokenizer_path}")
        self.tokenizer = transformers.AutoTokenizer.from_pretrained(
            tokenizer_path,
            token=private_repo_token,
            trust_remote_code=True,
        )
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        self.logger.log_info(f"Loading base model: {hf_model}")
        model = transformers.AutoModelForCausalLM.from_pretrained(
            hf_model,
            torch_dtype=torch.float16,
            device_map="auto",
            token=private_repo_token,
            trust_remote_code=True,
        )

        if adapter_path and os.path.exists(adapter_path):
            self.logger.log_info(f"Loading LoRA adapter: {adapter_path}")
            model = PeftModel.from_pretrained(model, adapter_path)
        else:
            self.logger.log_warn(f"LoRA adapter not found at {adapter_path}; serving base model only.")

        self.pipeline = transformers.pipeline(
            "text-generation",
            model=model,
            tokenizer=self.tokenizer,
        )

    def execute(self, requests):
        responses = []
        for request in requests:
            input_tensor = pb_utils.get_input_tensor_by_name(request, "text_input")
            prompt = input_tensor.as_numpy()[0].decode("utf-8")
            responses.append(self.generate(prompt))
        return responses

    def generate(self, prompt):
        formatted_prompt = (
            "<|user|>\n"
            f"{prompt}"
            "<|end|>\n"
            "<|assistant|>\n"
        )
        sequences = self.pipeline(
            formatted_prompt,
            do_sample=True,
            temperature=self.temperature,
            top_p=self.top_p,
            num_return_sequences=1,
            eos_token_id=self.tokenizer.eos_token_id,
            max_new_tokens=self.max_output_length,
            return_full_text=False,
        )

        texts = [seq["generated_text"].replace("<|end|>", "").strip() for seq in sequences]
        tensor = pb_utils.Tensor("text_output", np.array(texts, dtype=np.object_))
        return pb_utils.InferenceResponse(output_tensors=[tensor])

    def finalize(self):
        print("Cleaning up...")
