# OpenRouter API Analysis - Current Model Structure

## Endpoint Information

**URL**: `https://openrouter.ai/api/v1/models`
**Method**: GET
**Authentication**: Bearer token in Authorization header

## Query Parameters (Currently Supported)

1. `category` - Filter models by category
2. `supported_parameters` - Filter by supported parameters
3. `use_rss` - Return as RSS feed
4. `use_rss_chat_links` - Include chat links in RSS

## Response Structure

### Root Object
```json
{
  "data": [/* array of model objects */]
}
```

### Model Object Fields

#### Basic Identifiers
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Full model identifier with variant | "nvidia/nemotron-3-nano-30b-a3b:free" |
| `canonical_slug` | string | Base identifier without variant | "nvidia/nemotron-3-nano-30b-a3b" |
| `name` | string | Human-readable display name | "NVIDIA: Nemotron 3 Nano 30B A3B (free)" |
| `hugging_face_id` | string | Optional HuggingFace model ID | "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16" |
| `created` | integer | Unix timestamp of model addition | 1765731275 |

#### Core Properties
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `description` | string | Detailed model description and notes | "NVIDIA Nemotron 3 Nano..." |
| `context_length` | integer | Maximum context window in tokens | 256000 |

#### Architecture Object
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `modality` | string | Input/output format | "text->text", "text+image->text" |
| `input_modalities` | array[string] | Supported input types | ["text", "image", "file"] |
| `output_modalities` | array[string] | Supported output types | ["text", "image", "embeddings"] |
| `tokenizer` | string | Tokenizer type | "GPT", "Other" |
| `instruct_type` | string\|null | Instruction format | null |

#### Pricing Object
All prices are per token unless noted.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `prompt` | string | Input token price | "0.00000175" |
| `completion` | string | Output token price | "0.000014" |
| `request` | string | Per-request price | "0" |
| `image` | string | Per-image price | "0" |
| `web_search` | string | Web search feature price | "0.01" |
| `internal_reasoning` | string | Reasoning token price | "0" |
| `input_cache_read` | string | Cache read price | "0.000000175" |

**Notes:**
- Free models have "0" for all pricing fields
- Prices are in USD
- To calculate per-1K tokens: multiply by 1000

#### Top Provider Object
| Field | Type | Description |
|-------|------|-------------|
| `context_length` | integer | Provider's actual context limit |
| `max_completion_tokens` | integer\|null | Maximum output tokens per request |
| `is_moderated` | boolean | Whether content moderation is enabled |

#### Supported Parameters
Array of strings indicating which API parameters the model supports:

**Common Parameters:**
- `temperature` - Randomness control
- `top_p` - Nucleus sampling
- `top_k` - Top-K sampling
- `frequency_penalty` - Repetition penalty
- `presence_penalty` - Token presence penalty
- `repetition_penalty` - Alternative repetition control
- `min_p` - Minimum probability threshold
- `top_a` - Top-A sampling

**Advanced Features:**
- `tools` - Function/tool calling
- `tool_choice` - Control which tool to use
- `response_format` - Structured output format
- `structured_outputs` - JSON schema enforcement
- `reasoning` - Chain-of-thought reasoning
- `include_reasoning` - Include reasoning in response
- `seed` - Deterministic generation
- `max_tokens` - Output length limit
- `stop` - Stop sequences
- `logit_bias` - Token probability biasing
- `logprobs` - Return token probabilities
- `top_logprobs` - Number of top logprobs to return

**Specialized:**
- `prompt_truncate_len` - Prompt truncation
- `transforms` - Input transformations

#### Default Parameters Object
| Field | Type | Description |
|-------|------|-------------|
| `temperature` | float\|null | Default temperature |
| `top_p` | float\|null | Default top_p |
| `frequency_penalty` | float\|null | Default frequency penalty |

#### Per Request Limits
Can be null or contain:
- Maximum prompt tokens per request
- Maximum completion tokens per request

## Sample Model Records

### Free Model Example
```json
{
  "id": "nvidia/nemotron-3-nano-30b-a3b:free",
  "name": "NVIDIA: Nemotron 3 Nano 30B A3B (free)",
  "context_length": 256000,
  "pricing": {
    "prompt": "0",
    "completion": "0",
    "request": "0"
  },
  "supported_parameters": [
    "include_reasoning",
    "max_tokens",
    "reasoning",
    "seed",
    "temperature",
    "tool_choice",
    "tools",
    "top_p"
  ]
}
```

### Paid Model Example
```json
{
  "id": "openai/gpt-5.2-chat",
  "name": "OpenAI: GPT-5.2 Chat",
  "context_length": 128000,
  "pricing": {
    "prompt": "0.00000175",
    "completion": "0.000014",
    "web_search": "0.01",
    "input_cache_read": "0.000000175"
  },
  "architecture": {
    "modality": "text+image->text",
    "input_modalities": ["file", "image", "text"],
    "output_modalities": ["text"]
  },
  "top_provider": {
    "max_completion_tokens": 16384,
    "is_moderated": true
  }
}
```

## Searchable/Filterable Fields

Based on the structure, we can filter/search by:

### Direct Filters
- **Provider**: Extract from `id` (e.g., "openai/", "anthropic/", "nvidia/")
- **Free models**: `pricing.prompt == "0" && pricing.completion == "0"`
- **Context length**: `context_length >= X`
- **Moderation**: `top_provider.is_moderated`
- **Creation date**: `created >= timestamp`

### Capability Filters
- **Multimodal**: Check `architecture.input_modalities` length > 1
- **Vision**: `"image" in architecture.input_modalities`
- **File input**: `"file" in architecture.input_modalities`
- **Image output**: `"image" in architecture.output_modalities`
- **Tool calling**: `"tools" in supported_parameters`
- **Reasoning**: `"reasoning" in supported_parameters`
- **Structured output**: `"structured_outputs" in supported_parameters`

### Price-Based Filters
- **Prompt cost**: Parse `pricing.prompt` as float
- **Completion cost**: Parse `pricing.completion` as float
- **Total cost**: Combined prompt + completion
- **Has web search**: `pricing.web_search != "0"`
- **Has caching**: `pricing.input_cache_read != "0"`

### Text Search
- **Name**: Full-text search in `name` field
- **Description**: Search in `description` field
- **Provider**: Search in `id` field
- **Model family**: Search for "gpt", "claude", "llama", etc.

## Useful Derived Metrics

### Cost Per Million Tokens
```
prompt_per_1M = parseFloat(pricing.prompt) * 1_000_000
completion_per_1M = parseFloat(pricing.completion) * 1_000_000
total_per_1M = prompt_per_1M + completion_per_1M
```

### Capability Score
Count of supported parameters = indicator of feature richness

### Efficiency Metrics
- **Tokens per dollar**: `context_length / (prompt_per_1M + completion_per_1M)`
- **Relative cost**: Compare to baseline (e.g., GPT-4 Turbo)

### Categorization
Based on name/description/capabilities:
- "Instruct/Instructional" models
- "Chat" models
- "Vision" models
- "Fast/Turbo" models
- "Preview/Experimental" models
- "Free" models

## Common Query Patterns

### Find Cheapest Text Models
```
Filter: modality == "text->text"
Sort: prompt + completion price ascending
```

### Find Free Multimodal Models
```
Filter: pricing.prompt == "0" AND input_modalities.length > 1
Sort: context_length descending
```

### Find Models With Reasoning
```
Filter: "reasoning" in supported_parameters
Sort: created descending (newest first)
```

### Find Instructional Models
```
Filter: name.includes("Instruct") OR description.includes("instruction")
Sort: pricing ascending
```

### Find High-Context Models
```
Filter: context_length >= 100000
Sort: context_length descending
```

## Notes for Implementation

1. **Pricing as strings**: All pricing values are strings, need parseFloat() for comparisons
2. **Null handling**: Many fields can be null (hugging_face_id, instruct_type, max_completion_tokens)
3. **Provider extraction**: Parse `id` field (split on first "/")
4. **Free model detection**: Check if prompt AND completion are "0"
5. **Capability detection**: Search arrays (input_modalities, output_modalities, supported_parameters)
6. **Date handling**: `created` is Unix timestamp, convert for display
7. **Modality parsing**: Format is "input->output" or "input+input->output"
