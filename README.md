# Model Scout MCP

[![npm version](https://badge.fury.io/js/model-scout-mcp.svg)](https://www.npmjs.com/package/model-scout-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server for discovering, comparing, and selecting LLM models across providers with real-time pricing and capabilities.

## Problem Statement

Large Language Models often have outdated knowledge about:
- Newly released models and their exact names/IDs
- Current token pricing
- Model capabilities and supported features

This MCP server solves these problems by providing real-time access to model catalogs and intelligent search/comparison tools.

## Current Status

**Phase**: ✅ **Implemented and Tested**

**Provider Support**:
- ✅ **OpenRouter** - Currently supported (100+ models from 50+ providers)
- 🔄 Future: Additional providers may be added

**Note**: OpenRouter is currently the only supported provider because it provides comprehensive programmatic access to model pricing and capabilities. Not all model providers offer APIs for cost inspection, making OpenRouter an ideal aggregator for this use case.

## Documentation

- **[tools-consolidated.md](tools-consolidated.md)** - **Complete tool specifications** (start here)
- **[SUMMARY.md](SUMMARY.md)** - Executive summary and value proposition
- **[api-analysis.md](api-analysis.md)** - Detailed OpenRouter API structure and fields
- **[design.md](design.md)** - Architecture and design decisions

## Tool Architecture (2 Tools)

### 1. `get_model`
Direct lookup of a specific model by ID. Returns complete details including API endpoint information.

### 2. `consider_models`
Flexible tool for exploring, comparing, and analyzing models based on user needs. Handles:
- Filtering and searching
- Model comparison
- Cost analysis and projections
- Recommendations with trade-offs

**Design Philosophy**: One tool for lookup, one tool for consideration. The `consider_models` tool adapts its behavior based on the request - it can be as simple as listing free models or as complex as multi-factor decision analysis with cost projections.

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

## Installation

### Prerequisites
- Node.js 18 or higher
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

### Option 1: Install via npm (Recommended)

Install globally or use with npx:

```bash
# Install globally
npm install -g model-scout-mcp

# Or use with npx (no installation needed)
npx model-scout-mcp
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/danielrosehill/Model-Scout-MCP.git
cd Model-Scout-MCP

# Install dependencies
npm install

# Test the server (optional)
node test-server.js
```

## Usage with Claude Desktop

Add to your MCP settings file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Using npx (Recommended)

```json
{
  "mcpServers": {
    "model-scout": {
      "command": "npx",
      "args": ["-y", "model-scout-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Using Global Install

```json
{
  "mcpServers": {
    "model-scout": {
      "command": "model-scout-mcp",
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Using from Source

```json
{
  "mcpServers": {
    "model-scout": {
      "command": "node",
      "args": ["/absolute/path/to/Model-Scout-MCP/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Note**: Replace `your-api-key-here` with your actual OpenRouter API key from https://openrouter.ai/keys

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## License

MIT License - See LICENSE file for details

## Author

**Daniel Rosehill**
- Website: [danielrosehill.com](https://danielrosehill.com)
- GitHub: [@danielrosehill](https://github.com/danielrosehill)
- Email: public@danielrosehill.com
