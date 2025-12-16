# Token Compare MCP - Design Document

## Overview

This MCP server provides up-to-date model information and pricing from LLM aggregator platforms (starting with OpenRouter), solving the problem of outdated model knowledge in LLMs.

## Problem Statement

1. **Outdated Knowledge**: LLMs don't have current information about newly released models
2. **Model Names**: Exact model IDs and canonical slugs change frequently
3. **Pricing Volatility**: Token pricing changes regularly
4. **Discovery**: Finding models matching specific criteria (cheap, instructional, multimodal, etc.)

## OpenRouter API Analysis

### Endpoint
`GET https://openrouter.ai/api/v1/models`

### Model Object Structure

Each model contains:

**Identifiers:**
- `id`: Full identifier (e.g., "nvidia/nemotron-3-nano-30b-a3b:free")
- `canonical_slug`: Base identifier without variant suffix
- `name`: Human-readable display name
- `hugging_face_id`: Optional HuggingFace reference

**Core Attributes:**
- `created`: Unix timestamp
- `description`: Detailed model description
- `context_length`: Maximum context window in tokens

**Pricing (per token/request):**
- `prompt`: Input token cost
- `completion`: Output token cost
- `request`: Per-request cost
- `image`: Image input cost
- `web_search`: Web search cost
- `internal_reasoning`: Reasoning token cost
- `input_cache_read`: Cache read cost

**Capabilities:**
- `architecture.modality`: Input->output format (e.g., "text+image->text")
- `architecture.input_modalities`: Array of supported inputs (text, image, file, audio, video)
- `architecture.output_modalities`: Array of supported outputs (text, image, embeddings)
- `architecture.tokenizer`: Tokenizer type (GPT, Other, etc.)
- `architecture.instruct_type`: Instruction format

**Parameters:**
- `supported_parameters`: Array of API parameters (temperature, tools, reasoning, etc.)
- `default_parameters`: Default temperature, top_p, frequency_penalty

**Provider Info:**
- `top_provider.context_length`: Provider's context limit
- `top_provider.max_completion_tokens`: Max output tokens
- `top_provider.is_moderated`: Content moderation status

## Proposed MCP Tools

### 1. `list_models`
**Purpose**: Get all available models with optional filtering

**Parameters:**
- `category` (optional): Filter by category
- `modality` (optional): Filter by modality (text, image, multimodal)
- `free_only` (optional): Only show free models
- `max_prompt_price` (optional): Maximum prompt token price
- `max_completion_price` (optional): Maximum completion token price
- `min_context_length` (optional): Minimum context window size
- `supports_tools` (optional): Must support function calling
- `supports_reasoning` (optional): Must support reasoning/thinking
- `sort_by` (optional): Sort by price, context_length, created date

**Returns**: Array of model objects with key information

### 2. `get_model_details`
**Purpose**: Get complete details for a specific model

**Parameters:**
- `model_id`: Full model ID or canonical slug

**Returns**: Complete model object with all fields

### 3. `search_models`
**Purpose**: Natural language search for models matching criteria

**Parameters:**
- `query`: Search query (e.g., "cheap instructional model", "multimodal with vision", "free models with long context")
- `max_results` (optional): Limit number of results (default: 10)

**Returns**: Ranked list of matching models with relevance score

**Logic:**
- Parse query for keywords: "cheap", "free", "instructional", "vision", "multimodal", "long context", "fast", "reasoning"
- Apply filters based on detected criteria
- Score models based on how well they match
- Return top matches with explanation

### 4. `compare_models`
**Purpose**: Side-by-side comparison of multiple models

**Parameters:**
- `model_ids`: Array of 2-5 model IDs to compare

**Returns**: Comparison table showing:
- Pricing (prompt, completion, per 1K tokens)
- Context length
- Capabilities (modalities, parameters)
- Performance characteristics
- Cost estimates for typical usage

### 5. `recommend_model`
**Purpose**: Get personalized model recommendation based on use case

**Parameters:**
- `use_case`: Description of intended use (e.g., "chat application", "code generation", "long document analysis")
- `budget_constraint` (optional): Max cost per million tokens
- `required_features` (optional): Array of must-have features (tools, vision, reasoning)
- `preferences` (optional): Array of preferences (fast, creative, analytical, cheap)

**Returns**: Top 3-5 recommended models with:
- Match score
- Reasoning for recommendation
- Estimated costs for use case
- Pros/cons

### 6. `calculate_cost`
**Purpose**: Calculate estimated costs for a workload

**Parameters:**
- `model_id`: Model to calculate for
- `prompt_tokens` (optional): Estimated input tokens
- `completion_tokens` (optional): Estimated output tokens
- `requests` (optional): Number of requests
- `images` (optional): Number of images

**Returns**: Cost breakdown and total estimate

### 7. `get_cheapest_models`
**Purpose**: Find the cheapest models meeting minimum requirements

**Parameters:**
- `min_context_length` (optional): Minimum context needed
- `required_capabilities` (optional): Array of required features
- `modality` (optional): Required modality
- `limit` (optional): Number of results (default: 10)

**Returns**: Models sorted by cost (prompt + completion combined)

### 8. `get_model_alternatives`
**Purpose**: Find similar but cheaper/better alternatives to a model

**Parameters:**
- `model_id`: Reference model
- `optimize_for`: "cost", "performance", "context", "features"

**Returns**: Alternative models with comparison to reference

## Implementation Priorities

### Phase 1 (Core):
1. `list_models` - Basic listing with filters
2. `get_model_details` - Individual model lookup
3. `get_cheapest_models` - Cost-optimized search

### Phase 2 (Intelligence):
4. `search_models` - Natural language search
5. `compare_models` - Side-by-side comparison
6. `calculate_cost` - Cost estimation

### Phase 3 (Advanced):
7. `recommend_model` - AI-powered recommendations
8. `get_model_alternatives` - Smart alternatives finder

## Technical Considerations

### Caching Strategy
- Cache model list for 5-15 minutes (configurable)
- Models don't change that frequently, but pricing might
- Provide `force_refresh` parameter to bypass cache

### Error Handling
- Handle API rate limits gracefully
- Fallback to cached data if API unavailable
- Clear error messages for invalid model IDs

### Performance
- Fetch full model list once, filter in-memory
- Index models by common search criteria
- Pre-calculate pricing metrics for sorting

### Future Providers
Design tools to be provider-agnostic:
- Abstract provider interface
- Unified model schema
- Provider-specific adapters

## MCP Resources

Consider exposing as resources:
- `models://list` - Current model list
- `models://pricing` - Pricing comparison table
- `models://capabilities` - Capability matrix

## Example Use Cases

1. **"Find me a cheap instructional model"**
   → Use `search_models` with query or `get_cheapest_models` with filters

2. **"What's the latest GPT-4 variant?"**
   → Use `list_models` filtered by name/provider, sorted by created date

3. **"Compare Claude Opus vs Sonnet pricing"**
   → Use `compare_models` with both IDs

4. **"I need a model with vision for under $1 per million tokens"**
   → Use `search_models` or `list_models` with modality and pricing filters

5. **"What will it cost to process 100K tokens with GPT-4?"**
   → Use `calculate_cost` with model ID and token counts

6. **"Is there a cheaper alternative to Claude Opus?"**
   → Use `get_model_alternatives` with Claude Opus ID, optimized for cost
