# Token Compare MCP

An MCP (Model Context Protocol) server that provides up-to-date model information, pricing, and intelligent search capabilities for LLM aggregator platforms.

## Problem Statement

Large Language Models often have outdated knowledge about:
- Newly released models and their exact names/IDs
- Current token pricing
- Model capabilities and supported features

This MCP server solves these problems by providing real-time access to model catalogs and intelligent search/comparison tools.

## Current Status

**Phase**: Planning and Design

**Provider Support**:
- ✅ OpenRouter API analyzed and documented
- 🔄 Planned: Additional providers (Replicate, Together, etc.)

## Documentation

- **[SUMMARY.md](SUMMARY.md)** - Executive summary and value proposition
- **[tools-final.md](tools-final.md)** - **Final tool specifications** (recommended starting point)
- **[api-analysis.md](api-analysis.md)** - Detailed OpenRouter API structure and fields
- **[design.md](design.md)** - Overall architecture and design decisions
- **[tools-proposal.md](tools-proposal.md)** - Initial tool brainstorming (superseded by tools-final.md)

## Tool Architecture

### Core Tools (5 - Always Available)
1. **`get_model`** - Get model details + API endpoint information
2. **`list_models`** - List and filter available models
3. **`check_cost`** - Calculate costs for specific workload
4. **`compare_models`** - Side-by-side comparison of 2-5 models
5. **`search_models`** - Text search in model catalog

### Advanced Tool (1 - Optional)
6. **`consult_model_selection`** - AI-powered model consultation

**Design Philosophy**: Keep basic tools simple and explicit. The consultation tool orchestrates them for intelligent recommendations. Users can disable the consultation tool if they only want factual data retrieval.

## Key Features

### Model Discovery
- Search by natural language ("cheap instructional model")
- Filter by capabilities (vision, tools, reasoning)
- Filter by pricing, context length, provider
- Sort by various criteria (price, context, recency)

### Cost Optimization
- Calculate estimated costs for workloads
- Find cheapest models meeting requirements
- Compare pricing across multiple models
- Identify cost-effective alternatives

### Intelligent Recommendations
- Use-case based recommendations
- Trade-off analysis (cost vs capability)
- Alternative suggestions
- Personalized based on requirements

## Use Cases

### For LLM Applications
- **Grounding**: Get current model names and IDs
- **Cost Planning**: Estimate API costs before deployment
- **Optimization**: Find cheaper alternatives with similar capabilities
- **Discovery**: Find new models matching specific criteria

### Example Queries
```
"Find me a cheap instructional model"
→ search_models or find_cheapest with filters

"What's the latest GPT-4 variant?"
→ list_models filtered by provider, sorted by date

"Compare Claude Opus vs Sonnet pricing"
→ compare_models with both IDs

"I need a model with vision for under $1 per million tokens"
→ search_models or list_models with modality and price filters

"What will it cost to process 100K tokens with GPT-4?"
→ calculate_cost with model ID and token counts

"Is there a cheaper alternative to Claude Opus?"
→ find_alternatives optimized for cost
```

## Technical Approach

### Data Source
- OpenRouter API: `https://openrouter.ai/api/v1/models`
- Authenticated via bearer token
- Returns comprehensive model catalog with pricing and capabilities

### Caching Strategy
- Cache model list for 10 minutes (configurable)
- In-memory filtering and search
- `force_refresh` parameter to bypass cache

### Implementation Phases

**Phase 1 (MVP)**: Core tools
- `list_models`, `get_model`, `calculate_cost`

**Phase 2 (Enhanced)**: Intelligence
- `search_models`, `compare_models`, `find_cheapest`

**Phase 3 (Advanced)**: AI-powered
- `recommend_model`, `find_alternatives`

## API Key Setup

Create a `.env` file with:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

Get your API key from: https://openrouter.ai/keys

## Provider Details

### OpenRouter
OpenRouter aggregates models from multiple providers:
- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude models)
- Meta (Llama models)
- Google (Gemini, PaLM)
- Mistral AI
- And 50+ more providers

**API Documentation**: https://openrouter.ai/docs/api/reference/overview

## Future Enhancements

- Historical pricing tracking
- Performance benchmarks integration
- Model deprecation alerts
- Additional provider support
- Cost prediction based on usage patterns
- Bulk comparison tools
- Custom filtering DSL

## License

[Add license information]

## Contributing

[Add contribution guidelines]
