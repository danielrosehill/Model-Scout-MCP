# Token Compare MCP - Proposed Tools

## Core Value Proposition

This MCP server solves three key problems:
1. **Outdated model knowledge** - LLMs don't know about recently released models
2. **Model discovery** - Finding models that match specific criteria (cheap, capable, multimodal, etc.)
3. **Cost optimization** - Comparing pricing and estimating costs for workloads

## Recommended Tool Bundle (8 Tools)

### Tier 1: Essential Tools (Must-Have)

#### 1. `list_models`
**Purpose**: List all available models with flexible filtering

**Use Cases:**
- "Show me all free models"
- "List models with over 100K context"
- "Find all OpenAI models"

**Parameters:**
```typescript
{
  provider?: string;           // Filter by provider (e.g., "openai", "anthropic")
  free_only?: boolean;         // Only free models
  min_context?: number;        // Minimum context length
  max_context?: number;        // Maximum context length
  max_prompt_price?: number;   // Max cost per token (input)
  max_completion_price?: number; // Max cost per token (output)
  has_vision?: boolean;        // Supports image input
  has_tools?: boolean;         // Supports function calling
  has_reasoning?: boolean;     // Supports chain-of-thought
  modality?: string;           // Filter by modality pattern
  sort_by?: "price" | "context" | "created" | "name";
  limit?: number;              // Max results
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
      prompt_per_1m: number;
      completion_per_1m: number;
      total_per_1m: number;
    };
    capabilities: string[];
    created: string; // ISO date
  }>;
  total_count: number;
  filtered_count: number;
}
```

---

#### 2. `get_model`
**Purpose**: Get complete details for a specific model

**Use Cases:**
- "What are the details for Claude Opus?"
- "Show me everything about GPT-4 Turbo"

**Parameters:**
```typescript
{
  model_id: string;  // Full ID or partial match
}
```

**Returns:** Complete model object with all fields from API

---

#### 3. `search_models`
**Purpose**: Natural language search for models

**Use Cases:**
- "Find a cheap instructional model"
- "I need a multimodal model with vision"
- "Show me free models with long context"

**Parameters:**
```typescript
{
  query: string;      // Natural language query
  max_results?: number; // Default: 10
}
```

**Implementation Logic:**
- Parse query for keywords:
  - **Cost**: "cheap", "free", "expensive", "budget"
  - **Speed**: "fast", "quick", "instant", "turbo"
  - **Capabilities**: "vision", "multimodal", "tools", "function calling", "reasoning"
  - **Context**: "long context", "large context", "128k", "200k"
  - **Type**: "instruct", "instructional", "chat", "completion"
  - **Provider**: "openai", "anthropic", "claude", "gpt"
- Apply filters based on detected keywords
- Score results by relevance
- Return top matches with explanation

**Returns:**
```typescript
{
  models: Array<{
    /* model fields */,
    relevance_score: number;
    match_reason: string; // Why this model matched
  }>;
  query_interpretation: string; // How query was understood
}
```

---

### Tier 2: Power User Tools (High Value)

#### 4. `compare_models`
**Purpose**: Side-by-side comparison of 2-5 models

**Use Cases:**
- "Compare Claude Opus vs Sonnet"
- "Show me the difference between GPT-4 and GPT-4 Turbo"

**Parameters:**
```typescript
{
  model_ids: string[]; // 2-5 model IDs
  workload?: {         // Optional cost comparison scenario
    prompt_tokens: number;
    completion_tokens: number;
    num_requests: number;
  };
}
```

**Returns:**
```typescript
{
  comparison: {
    models: Array<ModelDetails>;
    dimensions: {
      pricing: ComparisonRow;
      context: ComparisonRow;
      capabilities: ComparisonRow;
      performance: ComparisonRow;
    };
    cost_estimate?: {
      per_model: Record<string, number>;
      cheapest: string;
      most_expensive: string;
    };
  };
}
```

---

#### 5. `calculate_cost`
**Purpose**: Estimate costs for a specific workload

**Use Cases:**
- "How much will 1M tokens cost with GPT-4?"
- "Calculate cost for 100 API calls with Claude"

**Parameters:**
```typescript
{
  model_id: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  num_requests?: number;
  images?: number;
  uses_web_search?: boolean;
}
```

**Returns:**
```typescript
{
  model: string;
  breakdown: {
    prompt_cost: number;
    completion_cost: number;
    request_cost: number;
    image_cost: number;
    web_search_cost: number;
    total: number;
  };
  formatted: string; // Human-readable "$12.34"
  per_request_average: number;
}
```

---

#### 6. `find_cheapest`
**Purpose**: Find the most cost-effective models meeting requirements

**Use Cases:**
- "What's the cheapest model with 100K context?"
- "Find me the cheapest model that supports tools"

**Parameters:**
```typescript
{
  min_context?: number;
  required_capabilities?: string[]; // ["tools", "vision", "reasoning"]
  modality?: string;
  exclude_free?: boolean; // Exclude free models (quality concerns)
  limit?: number;
}
```

**Returns:**
```typescript
{
  models: Array<{
    /* model fields */,
    cost_per_1m_tokens: number;
    rank: number;
  }>;
  cheapest: ModelDetails;
  price_range: {
    min: number;
    max: number;
    median: number;
  };
}
```

---

### Tier 3: Advanced/AI-Powered Tools

#### 7. `recommend_model`
**Purpose**: Get personalized recommendations based on use case

**Use Cases:**
- "Recommend a model for a chatbot"
- "I need a model for code generation"
- "What's best for long document analysis?"

**Parameters:**
```typescript
{
  use_case: string; // Description of intended use
  budget?: number;  // Max cost per 1M tokens
  required_features?: string[];
  priorities?: Array<"cost" | "speed" | "quality" | "context">;
  avoid_providers?: string[];
}
```

**Implementation Logic:**
- Parse use case for requirements:
  - **Chat**: Conversational models, instruction-following
  - **Code**: Code-specialized models, reasoning
  - **Analysis**: Long context, reasoning
  - **Creative**: High creativity, less constrained
  - **Vision**: Image input support
- Apply filters based on requirements
- Score models on multiple dimensions
- Return top 3-5 with detailed reasoning

**Returns:**
```typescript
{
  recommendations: Array<{
    model: ModelDetails;
    score: number;
    reasoning: string;
    pros: string[];
    cons: string[];
    estimated_cost: number;
  }>;
  use_case_analysis: string;
}
```

---

#### 8. `find_alternatives`
**Purpose**: Find similar but potentially better alternatives

**Use Cases:**
- "Find a cheaper alternative to Claude Opus"
- "What's similar to GPT-4 but faster?"

**Parameters:**
```typescript
{
  model_id: string; // Reference model
  optimize_for: "cost" | "performance" | "context" | "features";
  maintain_capabilities?: boolean; // Keep same capabilities
  max_price_increase?: number; // Allow up to X% more expensive
}
```

**Returns:**
```typescript
{
  reference_model: ModelDetails;
  alternatives: Array<{
    model: ModelDetails;
    comparison: {
      cost_difference: number; // % cheaper/more expensive
      context_difference: number;
      capability_match: number; // 0-1 score
      trade_offs: string[];
    };
    recommendation_score: number;
  }>;
  best_alternative: string;
}
```

---

## Tool Usage Examples

### Example 1: Finding the Right Model
```
User: "I need a cheap model with function calling"
→ Use: search_models("cheap model with function calling")
→ Or: find_cheapest({ required_capabilities: ["tools"] })
```

### Example 2: Cost Planning
```
User: "How much will it cost to process 1M tokens with Claude Sonnet?"
→ Use: calculate_cost({
     model_id: "anthropic/claude-sonnet",
     prompt_tokens: 500_000,
     completion_tokens: 500_000
   })
```

### Example 3: Model Migration
```
User: "I'm using GPT-4, is there something cheaper?"
→ Use: find_alternatives({
     model_id: "openai/gpt-4",
     optimize_for: "cost",
     maintain_capabilities: true
   })
```

### Example 4: Discovery
```
User: "What are the newest models?"
→ Use: list_models({ sort_by: "created", limit: 20 })
```

### Example 5: Decision Making
```
User: "Should I use Claude or GPT-4 for my chatbot?"
→ Use: recommend_model({
     use_case: "customer service chatbot",
     budget: 50, // $50 per 1M tokens
     priorities: ["quality", "cost"]
   })
→ Follow up with: compare_models({
     model_ids: [/* top recommendations */]
   })
```

## Implementation Priority

### Phase 1 (MVP - Week 1)
1. `list_models` - Core listing with filters
2. `get_model` - Individual model lookup
3. `calculate_cost` - Cost estimation

These three tools provide immediate value for grounding and basic queries.

### Phase 2 (Enhanced - Week 2)
4. `search_models` - Natural language search
5. `compare_models` - Model comparison
6. `find_cheapest` - Cost optimization

These add intelligent discovery and comparison capabilities.

### Phase 3 (Advanced - Week 3)
7. `recommend_model` - AI-powered recommendations
8. `find_alternatives` - Smart alternatives

These provide personalized, context-aware suggestions.

## Additional Considerations

### Caching
- Cache model list for 10 minutes (configurable)
- Provide `force_refresh` parameter on all tools
- Cache search results for 5 minutes per unique query

### Error Handling
- Graceful degradation if API unavailable
- Clear error messages for invalid model IDs
- Suggest corrections for typos in model names

### Resources (Optional)
Consider exposing MCP resources:
- `models://list` - Current model list
- `models://providers` - Available providers
- `models://capabilities` - Capability reference

### Future Enhancements
- Historical pricing tracking
- Performance benchmarks integration
- Model deprecation alerts
- Custom provider support (Replicate, Together, etc.)
