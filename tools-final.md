# Token Compare MCP - Final Tool Specifications

## Design Philosophy

**Core Principle**: Keep basic tools simple and explicit. Provide one intelligent "consultation" tool that orchestrates them for complex queries.

**Benefit**: Users can disable the AI-powered consultation tool if they only want factual data retrieval, making the MCP lighter and more predictable.

---

## Core Tools (5 Basic Operations)

### 1. `get_model`
**Purpose**: Retrieve complete details for a specific model, including API endpoint information

**Parameters:**
```typescript
{
  model_id: string;  // Full model ID or canonical slug
}
```

**Returns:**
```typescript
{
  // Identity
  id: string;                    // Full API identifier (use this in API calls)
  canonical_slug: string;        // Base identifier
  name: string;                  // Display name
  provider: string;              // Provider name (parsed from id)
  hugging_face_id?: string;      // HuggingFace reference

  // API Information
  api_endpoint: string;          // "https://openrouter.ai/api/v1/chat/completions"
  api_format: string;            // "OpenAI-compatible"

  // Core Specs
  context_length: number;
  max_completion_tokens?: number;
  created: string;               // ISO date
  description: string;

  // Capabilities
  modality: string;              // "text->text", "text+image->text"
  input_modalities: string[];    // ["text", "image", "file"]
  output_modalities: string[];   // ["text", "image"]
  supported_parameters: string[]; // ["temperature", "tools", "reasoning"]

  // Pricing (per token)
  pricing: {
    prompt: number;              // Per input token
    completion: number;          // Per output token
    prompt_per_1m: number;       // Per 1M input tokens
    completion_per_1m: number;   // Per 1M output tokens
    total_per_1m: number;        // Combined per 1M
    request?: number;            // Per-request fee
    image?: number;              // Per image
    web_search?: number;         // Web search fee
    has_caching: boolean;        // Cache support
  };

  // Provider Details
  is_moderated: boolean;
  is_free: boolean;
}
```

**Use Case:**
- "Get me the details for Claude Opus"
- "What's the API endpoint for GPT-4 Turbo?"
- "Show me the exact model ID I should use for API calls"

---

### 2. `list_models`
**Purpose**: List available models with filtering options

**Parameters:**
```typescript
{
  // Filters
  provider?: string;              // "openai", "anthropic", "meta"
  free_only?: boolean;
  min_context?: number;
  max_context?: number;
  max_price_per_1m?: number;     // Max total cost per 1M tokens
  has_vision?: boolean;
  has_tools?: boolean;
  has_reasoning?: boolean;
  modality?: string;              // "text->text", "text+image->text"

  // Output Control
  sort_by?: "price" | "context" | "created" | "name";
  limit?: number;                 // Default: 50
  offset?: number;                // For pagination

  // Cache Control
  force_refresh?: boolean;        // Bypass cache
}
```

**Returns:**
```typescript
{
  models: Array<{
    id: string;
    name: string;
    provider: string;
    context_length: number;
    pricing: {
      total_per_1m: number;
      prompt_per_1m: number;
      completion_per_1m: number;
    };
    capabilities: string[];       // ["vision", "tools", "reasoning"]
    is_free: boolean;
    created: string;
  }>;
  total_count: number;
  returned_count: number;
  cache_age?: number;             // Seconds since last refresh
}
```

**Use Cases:**
- "List all free models"
- "Show me OpenAI models with over 100K context"
- "What models support function calling?"

---

### 3. `check_cost`
**Purpose**: Calculate cost for a specific model and workload

**Parameters:**
```typescript
{
  model_id: string;

  // Workload specification
  prompt_tokens?: number;
  completion_tokens?: number;
  num_requests?: number;          // Number of API calls

  // Optional features
  images?: number;                // Number of images
  uses_web_search?: boolean;
  uses_reasoning?: boolean;
}
```

**Returns:**
```typescript
{
  model_id: string;
  model_name: string;

  // Cost Breakdown
  breakdown: {
    prompt_cost: number;
    completion_cost: number;
    request_cost: number;
    image_cost: number;
    feature_costs: number;        // web_search, reasoning, etc.
    total: number;
  };

  // Formatted outputs
  formatted_total: string;        // "$12.34"
  per_request_average: number;    // Average cost per API call

  // Context
  workload: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    num_requests: number;
  };
}
```

**Use Cases:**
- "How much will 1M tokens cost with GPT-4?"
- "Calculate cost for 100 API calls with Claude Sonnet"
- "What's the cost per request for this workload?"

---

### 4. `compare_models`
**Purpose**: Side-by-side comparison of 2-5 models

**Parameters:**
```typescript
{
  model_ids: string[];            // 2-5 model IDs

  // Optional: Cost comparison scenario
  workload?: {
    prompt_tokens: number;
    completion_tokens: number;
    num_requests: number;
  };
}
```

**Returns:**
```typescript
{
  models: Array<ModelSummary>;    // Full details for each

  comparison_table: {
    // Pricing comparison
    pricing: {
      headers: ["Model", "Prompt/1M", "Completion/1M", "Total/1M"];
      rows: string[][];
      cheapest: string;           // Model ID of cheapest
    };

    // Capability comparison
    capabilities: {
      headers: ["Model", "Context", "Vision", "Tools", "Reasoning"];
      rows: string[][];
    };

    // Cost estimate (if workload provided)
    cost_estimate?: {
      headers: ["Model", "Total Cost", "Cost/Request"];
      rows: string[][];
      cheapest: string;
      savings_vs_most_expensive: number;
    };
  };

  summary: {
    cheapest_model: string;
    highest_context: string;
    most_capable: string;         // Most supported parameters
  };
}
```

**Use Cases:**
- "Compare Claude Opus vs GPT-4"
- "Show me the difference between these 3 models"
- "Which is cheaper for my workload?"

---

### 5. `search_models`
**Purpose**: Find models matching text criteria

**Parameters:**
```typescript
{
  query: string;                  // Search in name, description, provider
  max_results?: number;           // Default: 20
  force_refresh?: boolean;
}
```

**Returns:**
```typescript
{
  query: string;
  results: Array<{
    id: string;
    name: string;
    provider: string;
    context_length: number;
    pricing: {
      total_per_1m: number;
    };
    match_score: number;          // 0-1 relevance score
    match_fields: string[];       // ["name", "description"]
  }>;
  result_count: number;
}
```

**Use Cases:**
- "Search for 'instruct' models"
- "Find models with 'llama' in the name"
- "Search for 'turbo' models"

---

## Advanced Tool (1 AI-Powered)

### 6. `consult_model_selection`
**Purpose**: AI-powered consultation for model selection based on requirements

**Note**: This tool can be disabled by users who only want factual data retrieval.

**Parameters:**
```typescript
{
  // User's requirements (natural language or structured)
  request: string;                // "I need a cheap instructional model"

  // Optional structured constraints
  constraints?: {
    max_budget_per_1m?: number;
    min_context?: number;
    required_capabilities?: string[];
    avoid_providers?: string[];
    priorities?: Array<"cost" | "quality" | "speed" | "context">;
  };

  // Context
  use_case?: string;              // "chatbot", "code generation", "analysis"
  expected_usage?: {
    requests_per_day?: number;
    avg_prompt_tokens?: number;
    avg_completion_tokens?: number;
  };
}
```

**Implementation:**
This tool orchestrates the basic tools:
1. Parses the natural language request
2. Calls `list_models` with appropriate filters
3. May call `check_cost` for cost estimates
4. May call `compare_models` for top candidates
5. Returns intelligent recommendations with reasoning

**Returns:**
```typescript
{
  // Interpretation
  understood_requirements: {
    parsed_criteria: string[];
    detected_priorities: string[];
    applied_filters: object;
  };

  // Recommendations
  recommendations: Array<{
    model: ModelSummary;
    recommendation_score: number;   // 0-100
    reasoning: string;              // Why this model was recommended
    pros: string[];
    cons: string[];

    // Cost projection (if usage provided)
    estimated_monthly_cost?: number;
  }>;

  // Comparison of top 3
  top_3_comparison?: ComparisonTable;

  // Guidance
  guidance: string;                 // Additional advice
  alternatives?: string[];          // "Also consider..."
}
```

**Use Cases:**
- "I need a cheap instructional model"
- "Recommend a model for my chatbot that costs under $50/month"
- "What's the best model for long document analysis?"
- "I need vision support under $1 per million tokens"

**Why It's Separate:**
- Users who want only factual data can disable this tool
- Reduces complexity for simple lookups
- AI reasoning is only invoked when needed
- Lighter MCP server when consultation isn't required

---

## Tool Relationships

```
Basic Tools (Always Available):
├── get_model          → Detailed model info + API endpoint
├── list_models        → Filtered catalog browsing
├── check_cost         → Cost calculation for specific model
├── compare_models     → Side-by-side comparison
└── search_models      → Text search in catalog

Advanced Tool (Optional):
└── consult_model_selection → Uses basic tools to provide intelligent recommendations
    ├── Calls list_models for candidates
    ├── Calls check_cost for estimates
    ├── Calls compare_models for top options
    └── Returns AI-powered recommendations
```

---

## Usage Examples

### Example 1: Direct Factual Lookup
```
User: "What's the API endpoint for Claude Opus?"
LLM: [Calls get_model("anthropic/claude-opus")]
Returns: Full details including API endpoint
```

### Example 2: Cost Planning
```
User: "How much will 1M tokens cost with GPT-4?"
LLM: [Calls check_cost({
  model_id: "openai/gpt-4",
  prompt_tokens: 500000,
  completion_tokens: 500000
})]
Returns: Cost breakdown
```

### Example 3: Comparison
```
User: "Compare Claude Opus vs Sonnet"
LLM: [Calls compare_models({
  model_ids: ["anthropic/claude-opus", "anthropic/claude-sonnet"]
})]
Returns: Comparison table
```

### Example 4: Intelligent Consultation
```
User: "I need a cheap instructional model"
LLM: [Calls consult_model_selection({
  request: "cheap instructional model",
  constraints: {
    priorities: ["cost"]
  }
})]

consult_model_selection internally:
  1. Calls list_models({ sort_by: "price" })
  2. Filters for instructional models
  3. Calls compare_models for top 3
  4. Returns recommendations with reasoning
```

### Example 5: Hybrid Approach
```
User: "Find models with vision support"
LLM: [Calls list_models({ has_vision: true })]

User: "Compare the top 3"
LLM: [Calls compare_models({ model_ids: [...] })]

User: "What's my best option for under $10?"
LLM: [Calls consult_model_selection({
  request: "best vision model under $10 per million tokens",
  constraints: { max_budget_per_1m: 10 }
})]
```

---

## Implementation Priority

### Phase 1 (Week 1) - Core Tools
1. `get_model` - Essential for model lookup
2. `list_models` - Core browsing capability
3. `check_cost` - Cost calculation

### Phase 2 (Week 2) - Comparison & Search
4. `compare_models` - Model comparison
5. `search_models` - Text search

### Phase 3 (Week 3) - Intelligence
6. `consult_model_selection` - AI-powered recommendations

---

## Benefits of This Structure

### Simplicity
- 5 basic tools do one thing each, well
- Clear, predictable behavior
- Easy to understand and test

### Flexibility
- Users can disable consultation tool
- Can use basic tools directly for factual queries
- Consultation tool can be as smart as needed

### Composability
- Consultation tool orchestrates basic tools
- Each tool is independently useful
- Can be used in various combinations

### Performance
- Basic tools are fast (direct API queries)
- Caching strategy is simple
- AI reasoning only when explicitly requested

### Maintainability
- Clear separation of concerns
- Basic tools are stable
- Can enhance consultation logic without touching core tools
