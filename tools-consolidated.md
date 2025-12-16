# Token Compare MCP - Consolidated Tool Design

## Design Philosophy

**Core Insight**: Instead of many narrow tools, provide two flexible tools that handle the full spectrum of model exploration and decision-making.

---

## Final Tool Set (2 Tools)

### 1. `get_model`
**Purpose**: Retrieve complete details for a specific model

**Why It's Separate**: Direct lookup by ID is a fundamental operation that should be fast and explicit.

**Parameters:**
```typescript
{
  model_id: string;  // Full model ID or canonical slug
}
```

**Returns:**
```typescript
{
  // Identity & API Information
  id: string;                    // Full API identifier (use this in API calls)
  canonical_slug: string;        // Base identifier
  name: string;                  // Display name
  provider: string;              // Provider name (e.g., "openai", "anthropic")
  api_endpoint: string;          // "https://openrouter.ai/api/v1/chat/completions"
  api_format: string;            // "OpenAI-compatible"
  hugging_face_id?: string;      // HuggingFace reference if available

  // Core Specifications
  context_length: number;
  max_completion_tokens?: number;
  created: string;               // ISO date
  description: string;

  // Capabilities
  modality: string;              // "text->text", "text+image->text"
  input_modalities: string[];    // ["text", "image", "file", "audio", "video"]
  output_modalities: string[];   // ["text", "image", "embeddings"]
  supported_parameters: string[]; // All API parameters this model supports

  // Pricing (all values in USD)
  pricing: {
    prompt: number;              // Per input token
    completion: number;          // Per output token
    prompt_per_1m: number;       // Per 1M input tokens
    completion_per_1m: number;   // Per 1M output tokens
    total_per_1m: number;        // Combined cost per 1M tokens
    request?: number;            // Per-request fee
    image?: number;              // Per image
    web_search?: number;         // Web search fee
    internal_reasoning?: number; // Reasoning token fee
    has_caching: boolean;        // Cache support available
    cache_read_per_1m?: number;  // Cache read cost per 1M tokens
  };

  // Provider Details
  is_moderated: boolean;
  is_free: boolean;
}
```

**Use Cases:**
- "Get details for Claude Opus"
- "What's the API endpoint for GPT-4?"
- "Show me the exact model ID for API calls"
- "Is this model free?"

---

### 2. `consider_models`
**Purpose**: Help user consider and compare models based on their needs

**Why It's Powerful**:
- Single tool handles filtering, searching, comparing, cost analysis
- Natural language interface
- Can be as simple or complex as needed
- Scope is "consideration" - exploring options and trade-offs

**Parameters:**
```typescript
{
  // What the user wants to explore (natural language)
  request: string;              // Required - user's query/requirement

  // Optional structured filters (if user wants to be specific)
  filters?: {
    provider?: string | string[];
    free_only?: boolean;
    min_context?: number;
    max_context?: number;
    max_price_per_1m?: number;
    has_vision?: boolean;
    has_tools?: boolean;
    has_reasoning?: boolean;
    modality?: string;
  };

  // Optional: Specific models to compare
  model_ids?: string[];         // If user wants to compare specific models

  // Optional: Cost scenario
  workload?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    requests_per_day?: number;
    requests_per_month?: number;
    images?: number;
  };

  // Output preferences
  max_results?: number;         // How many models to return (default: 10)
  sort_by?: "price" | "context" | "created" | "relevance";
}
```

**Returns:**
```typescript
{
  // Understanding of the request
  interpretation: {
    understood_as: string;      // How the request was interpreted
    applied_filters: object;    // What filters were applied
    search_strategy: string;    // How models were selected
  };

  // Results
  models: Array<{
    // Full model details
    id: string;
    name: string;
    provider: string;
    context_length: number;

    // Pricing
    pricing: {
      prompt_per_1m: number;
      completion_per_1m: number;
      total_per_1m: number;
    };

    // Capabilities summary
    capabilities: string[];     // ["vision", "tools", "reasoning"]
    is_free: boolean;

    // Relevance to request
    match_score?: number;       // 0-100 if search/relevance-based
    match_reason?: string;      // Why this model was included

    // Cost projection (if workload provided)
    estimated_cost?: {
      daily?: number;
      monthly?: number;
      per_request?: number;
      breakdown?: object;
    };
  }>;

  // If comparing specific models
  comparison?: {
    table: {
      pricing: ComparisonTable;
      capabilities: ComparisonTable;
      context: ComparisonTable;
    };
    summary: {
      cheapest: string;
      highest_context: string;
      most_capable: string;
      best_value?: string;      // Best price/performance
    };
  };

  // If cost analysis requested
  cost_analysis?: {
    cheapest_option: {
      model_id: string;
      cost: number;
    };
    most_expensive_option: {
      model_id: string;
      cost: number;
    };
    potential_savings: number;  // Difference between cheapest and most expensive
  };

  // Guidance
  recommendations?: {
    top_choice?: {
      model_id: string;
      reasoning: string;
    };
    alternatives?: Array<{
      model_id: string;
      trade_off: string;        // What you gain/lose vs top choice
    }>;
    considerations?: string[];  // Things to think about
  };

  // Metadata
  total_models_found: number;
  models_returned: number;
  cache_age?: number;           // Seconds since data refresh
}
```

---

## How `consider_models` Handles Different Scenarios

### Scenario 1: Simple Filtering
**Request**: "Show me free models"
```typescript
consider_models({
  request: "free models"
})
```
**Behavior**:
- Applies filter `free_only: true`
- Returns list of free models
- No comparison or cost analysis needed

---

### Scenario 2: Search with Criteria
**Request**: "I need a cheap instructional model"
```typescript
consider_models({
  request: "cheap instructional model"
})
```
**Behavior**:
- Parses "cheap" → sort by price, prioritize low-cost
- Parses "instructional" → search for "instruct" in name/description
- Returns ranked results with match reasoning
- Shows price comparison

---

### Scenario 3: Direct Comparison
**Request**: "Compare Claude Opus vs GPT-4"
```typescript
consider_models({
  request: "compare these models",
  model_ids: ["anthropic/claude-opus", "openai/gpt-4"]
})
```
**Behavior**:
- Fetches both models
- Generates comparison tables
- Shows pricing, capabilities, context differences
- Provides summary of trade-offs

---

### Scenario 4: Cost Analysis
**Request**: "What will 1M tokens cost with GPT-4?"
```typescript
consider_models({
  request: "cost for GPT-4",
  model_ids: ["openai/gpt-4"],
  workload: {
    prompt_tokens: 500000,
    completion_tokens: 500000
  }
})
```
**Behavior**:
- Fetches GPT-4 pricing
- Calculates exact cost for workload
- Returns cost breakdown
- Could also suggest cheaper alternatives

---

### Scenario 5: Budget-Constrained Search
**Request**: "Models with vision under $10 per million tokens"
```typescript
consider_models({
  request: "vision models under budget",
  filters: {
    has_vision: true,
    max_price_per_1m: 10
  }
})
```
**Behavior**:
- Applies filters
- Returns matching models sorted by price
- Shows how close each is to budget limit

---

### Scenario 6: Complex Decision-Making
**Request**: "I need a model for my chatbot that costs under $50/month"
```typescript
consider_models({
  request: "chatbot model under monthly budget",
  filters: {
    max_price_per_1m: 50
  },
  workload: {
    requests_per_day: 1000,
    prompt_tokens: 500,
    completion_tokens: 200
  }
})
```
**Behavior**:
- Calculates monthly cost for each model
- Filters to those under $50/month
- Ranks by value (features per dollar)
- Provides top recommendation with reasoning
- Shows alternatives with trade-offs

---

## Implementation Strategy

### Internal Logic Flow

```typescript
function consider_models(params) {
  // 1. Parse natural language request
  const intent = parseRequest(params.request);

  // 2. Fetch and filter models
  let models = await fetchModels();

  if (params.filters) {
    models = applyFilters(models, params.filters);
  }

  if (intent.filters) {
    models = applyFilters(models, intent.filters);
  }

  if (intent.search_terms) {
    models = searchModels(models, intent.search_terms);
  }

  // 3. Handle specific model comparison
  if (params.model_ids && params.model_ids.length > 1) {
    return generateComparison(params.model_ids, params.workload);
  }

  // 4. Calculate costs if workload provided
  if (params.workload) {
    models = models.map(model => ({
      ...model,
      estimated_cost: calculateCost(model, params.workload)
    }));
  }

  // 5. Sort and rank
  models = sortModels(models, params.sort_by || intent.sort_preference);

  // 6. Generate recommendations if appropriate
  const recommendations = generateRecommendations(models, intent, params);

  // 7. Return comprehensive response
  return {
    interpretation: intent,
    models: models.slice(0, params.max_results || 10),
    comparison: params.model_ids ? generateComparisonTable(models) : undefined,
    cost_analysis: params.workload ? generateCostAnalysis(models) : undefined,
    recommendations,
    total_models_found: models.length
  };
}
```

---

## Why This Design Works

### 1. **Single Point of Entry**
- User doesn't need to choose between multiple tools
- LLM can route all model exploration queries to one tool
- Simpler mental model

### 2. **Flexible Scope**
- Handles everything from simple lists to complex comparisons
- Natural language request allows open-ended exploration
- Structured parameters for precision when needed

### 3. **Contextual Intelligence**
- Tool can apply different logic based on request type
- Can be as simple (filtering) or smart (recommendations) as needed
- Single tool means consistent caching and optimization

### 4. **Cost-Aware by Default**
- Every query can optionally include cost projection
- Cost comparison is natural part of "consideration"
- No separate "calculate cost" tool needed

### 5. **Compositional**
- Can do multiple things in one call (filter + compare + cost)
- Reduces round-trips between LLM and MCP
- More efficient for complex queries

---

## Tool Usage Examples

### Example 1: Quick Lookup
```
User: "Show me free models"
LLM: consider_models({ request: "free models" })
```

### Example 2: Search
```
User: "Find instructional models"
LLM: consider_models({ request: "instructional models" })
```

### Example 3: Comparison
```
User: "Compare Claude Opus and GPT-4"
LLM: consider_models({
  request: "compare these models",
  model_ids: ["anthropic/claude-opus", "openai/gpt-4"]
})
```

### Example 4: Cost Planning
```
User: "What will my chatbot cost with GPT-4?"
LLM: consider_models({
  request: "cost analysis",
  model_ids: ["openai/gpt-4"],
  workload: { requests_per_day: 1000, prompt_tokens: 500, completion_tokens: 200 }
})
```

### Example 5: Complex Decision
```
User: "I need a cheap model with vision under $1 per million tokens"
LLM: consider_models({
  request: "cheap vision model",
  filters: { has_vision: true, max_price_per_1m: 1 }
})
```

---

## Benefits of 2-Tool Design

### Simplicity
- Only 2 tools to understand and maintain
- Clear separation: lookup vs. exploration
- Minimal cognitive overhead

### Power
- `consider_models` is incredibly flexible
- Handles 90% of use cases
- Can be enhanced without adding tools

### Performance
- Fewer tool definitions
- Single caching strategy
- Reduced MCP overhead

### User Experience
- Natural language requests
- Don't need to know tool boundaries
- One tool for thinking about options

### Maintainability
- Logic is centralized
- Easy to enhance behavior
- Clear contracts

---

## Implementation Priority

### Phase 1 (Week 1)
- Implement `get_model` (straightforward lookup)
- Implement basic `consider_models` (filtering and listing)

### Phase 2 (Week 2)
- Add comparison logic to `consider_models`
- Add cost calculation to `consider_models`
- Add search/relevance scoring

### Phase 3 (Week 3)
- Add intelligent recommendations
- Add complex cost projections
- Enhance natural language parsing

---

## Summary

**Before**: 6 tools with overlapping concerns
**After**: 2 tools with clear purposes

1. **`get_model`** - Direct lookup (fast, explicit)
2. **`consider_models`** - Everything else (flexible, powerful)

The name "consider" perfectly captures the intent: the user is **considering their options** around model selection, whether that's browsing, comparing, calculating costs, or getting recommendations.
