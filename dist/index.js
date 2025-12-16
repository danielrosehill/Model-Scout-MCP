#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Cache for model data
let modelsCache = {
  data: null,
  timestamp: null,
};

/**
 * Fetch models from OpenRouter API
 */
async function fetchModels(forceRefresh = false) {
  const now = Date.now();

  // Return cached data if valid
  if (!forceRefresh && modelsCache.data && modelsCache.timestamp) {
    const age = now - modelsCache.timestamp;
    if (age < CACHE_DURATION_MS) {
      return {
        models: modelsCache.data,
        cache_age: Math.floor(age / 1000),
        cached: true
      };
    }
  }

  // Fetch fresh data
  const response = await fetch(OPENROUTER_API_URL, {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Update cache
  modelsCache.data = data.data;
  modelsCache.timestamp = now;

  return {
    models: data.data,
    cache_age: 0,
    cached: false
  };
}

/**
 * Parse pricing from string to number
 */
function parsePrice(priceStr) {
  return priceStr ? parseFloat(priceStr) : 0;
}

/**
 * Extract provider from model ID
 */
function extractProvider(modelId) {
  const parts = modelId.split('/');
  return parts[0] || '';
}

/**
 * Check if model is free
 */
function isFree(pricing) {
  return parsePrice(pricing.prompt) === 0 && parsePrice(pricing.completion) === 0;
}

/**
 * Get capabilities array from model
 */
function getCapabilities(model) {
  const caps = [];

  if (model.architecture?.input_modalities?.includes('image')) {
    caps.push('vision');
  }
  if (model.architecture?.input_modalities?.length > 1) {
    caps.push('multimodal');
  }
  if (model.supported_parameters?.includes('tools')) {
    caps.push('tools');
  }
  if (model.supported_parameters?.includes('reasoning')) {
    caps.push('reasoning');
  }
  if (model.supported_parameters?.includes('structured_outputs')) {
    caps.push('structured_outputs');
  }

  return caps;
}

/**
 * Format model data for response
 */
function formatModelData(model) {
  const promptPrice = parsePrice(model.pricing.prompt);
  const completionPrice = parsePrice(model.pricing.completion);

  return {
    id: model.id,
    canonical_slug: model.canonical_slug,
    name: model.name,
    provider: extractProvider(model.id),
    api_endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    api_format: 'OpenAI-compatible',
    hugging_face_id: model.hugging_face_id || undefined,

    context_length: model.context_length,
    max_completion_tokens: model.top_provider?.max_completion_tokens || undefined,
    created: new Date(model.created * 1000).toISOString(),
    description: model.description,

    modality: model.architecture?.modality,
    input_modalities: model.architecture?.input_modalities || [],
    output_modalities: model.architecture?.output_modalities || [],
    supported_parameters: model.supported_parameters || [],

    pricing: {
      prompt: promptPrice,
      completion: completionPrice,
      prompt_per_1m: promptPrice * 1_000_000,
      completion_per_1m: completionPrice * 1_000_000,
      total_per_1m: (promptPrice + completionPrice) * 1_000_000,
      request: parsePrice(model.pricing.request) || undefined,
      image: parsePrice(model.pricing.image) || undefined,
      web_search: parsePrice(model.pricing.web_search) || undefined,
      internal_reasoning: parsePrice(model.pricing.internal_reasoning) || undefined,
      has_caching: !!model.pricing.input_cache_read,
      cache_read_per_1m: model.pricing.input_cache_read ?
        parsePrice(model.pricing.input_cache_read) * 1_000_000 : undefined,
    },

    is_moderated: model.top_provider?.is_moderated || false,
    is_free: isFree(model.pricing),
  };
}

/**
 * Tool: get_model
 */
async function getModel(modelId) {
  const { models } = await fetchModels();

  // Find model by exact ID or canonical slug
  const model = models.find(m =>
    m.id === modelId ||
    m.canonical_slug === modelId ||
    m.id.toLowerCase() === modelId.toLowerCase() ||
    m.name.toLowerCase().includes(modelId.toLowerCase())
  );

  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  return formatModelData(model);
}

/**
 * Apply filters to models
 */
function applyFilters(models, filters) {
  let filtered = [...models];

  if (filters.provider) {
    const providers = Array.isArray(filters.provider) ? filters.provider : [filters.provider];
    filtered = filtered.filter(m =>
      providers.some(p => extractProvider(m.id).toLowerCase() === p.toLowerCase())
    );
  }

  if (filters.free_only) {
    filtered = filtered.filter(m => isFree(m.pricing));
  }

  if (filters.min_context) {
    filtered = filtered.filter(m => m.context_length >= filters.min_context);
  }

  if (filters.max_context) {
    filtered = filtered.filter(m => m.context_length <= filters.max_context);
  }

  if (filters.max_price_per_1m) {
    filtered = filtered.filter(m => {
      const totalPer1m = (parsePrice(m.pricing.prompt) + parsePrice(m.pricing.completion)) * 1_000_000;
      return totalPer1m <= filters.max_price_per_1m;
    });
  }

  if (filters.has_vision) {
    filtered = filtered.filter(m =>
      m.architecture?.input_modalities?.includes('image')
    );
  }

  if (filters.has_tools) {
    filtered = filtered.filter(m =>
      m.supported_parameters?.includes('tools')
    );
  }

  if (filters.has_reasoning) {
    filtered = filtered.filter(m =>
      m.supported_parameters?.includes('reasoning')
    );
  }

  if (filters.modality) {
    filtered = filtered.filter(m =>
      m.architecture?.modality === filters.modality
    );
  }

  return filtered;
}

/**
 * Parse natural language request for intent
 */
function parseRequest(request) {
  const lower = request.toLowerCase();
  const intent = {
    filters: {},
    search_terms: [],
    sort_preference: 'relevance',
    understood_as: '',
  };

  // Cost-related keywords
  if (lower.includes('cheap') || lower.includes('affordable') || lower.includes('low cost')) {
    intent.sort_preference = 'price';
    intent.understood_as = 'cost-optimized search';
  }
  if (lower.includes('free')) {
    intent.filters.free_only = true;
    intent.understood_as = 'free models only';
  }

  // Capability keywords
  if (lower.includes('vision') || lower.includes('image') || lower.includes('multimodal')) {
    intent.filters.has_vision = true;
    intent.search_terms.push('vision', 'multimodal');
  }
  if (lower.includes('tool') || lower.includes('function')) {
    intent.filters.has_tools = true;
    intent.search_terms.push('tools', 'function');
  }
  if (lower.includes('reasoning') || lower.includes('think')) {
    intent.filters.has_reasoning = true;
    intent.search_terms.push('reasoning');
  }

  // Type keywords
  if (lower.includes('instruct')) {
    intent.search_terms.push('instruct');
  }
  if (lower.includes('chat')) {
    intent.search_terms.push('chat');
  }

  // Context keywords
  if (lower.includes('long context') || lower.includes('large context')) {
    intent.filters.min_context = 100000;
    intent.sort_preference = 'context';
  }

  // Provider keywords
  const providers = ['openai', 'anthropic', 'claude', 'gpt', 'meta', 'llama', 'google', 'gemini'];
  for (const provider of providers) {
    if (lower.includes(provider)) {
      intent.search_terms.push(provider);
    }
  }

  return intent;
}

/**
 * Search models by text
 */
function searchModels(models, searchTerms) {
  if (!searchTerms || searchTerms.length === 0) {
    return models.map(m => ({ model: m, score: 1 }));
  }

  return models.map(model => {
    let score = 0;
    const searchableText = `${model.name} ${model.description} ${model.id}`.toLowerCase();

    for (const term of searchTerms) {
      if (searchableText.includes(term.toLowerCase())) {
        score += 1;
      }
    }

    return { model, score };
  }).filter(item => item.score > 0);
}

/**
 * Calculate cost for workload
 */
function calculateCost(model, workload) {
  const pricing = model.pricing;
  let totalCost = 0;
  const breakdown = {};

  if (workload.prompt_tokens) {
    breakdown.prompt_cost = parsePrice(pricing.prompt) * workload.prompt_tokens;
    totalCost += breakdown.prompt_cost;
  }

  if (workload.completion_tokens) {
    breakdown.completion_cost = parsePrice(pricing.completion) * workload.completion_tokens;
    totalCost += breakdown.completion_cost;
  }

  if (workload.requests_per_day) {
    const requestCost = parsePrice(pricing.request) || 0;
    breakdown.daily_request_cost = requestCost * workload.requests_per_day;
    breakdown.monthly_request_cost = breakdown.daily_request_cost * 30;
    totalCost += breakdown.daily_request_cost;
  }

  if (workload.requests_per_month) {
    const requestCost = parsePrice(pricing.request) || 0;
    breakdown.monthly_request_cost = requestCost * workload.requests_per_month;
    totalCost += breakdown.monthly_request_cost;
  }

  if (workload.images) {
    breakdown.image_cost = parsePrice(pricing.image) * workload.images;
    totalCost += breakdown.image_cost;
  }

  return {
    total: totalCost,
    breakdown,
    daily: workload.requests_per_day ? totalCost : undefined,
    monthly: workload.requests_per_day ? totalCost * 30 :
             workload.requests_per_month ? totalCost : undefined,
    per_request: workload.requests_per_day || workload.requests_per_month ?
      totalCost / (workload.requests_per_day || workload.requests_per_month / 30) : undefined,
  };
}

/**
 * Sort models
 */
function sortModels(models, sortBy) {
  const sorted = [...models];

  switch (sortBy) {
    case 'price':
      sorted.sort((a, b) => {
        const aTotal = (parsePrice(a.pricing.prompt) + parsePrice(a.pricing.completion));
        const bTotal = (parsePrice(b.pricing.prompt) + parsePrice(b.pricing.completion));
        return aTotal - bTotal;
      });
      break;
    case 'context':
      sorted.sort((a, b) => b.context_length - a.context_length);
      break;
    case 'created':
      sorted.sort((a, b) => b.created - a.created);
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      // Keep original order or score-based order
      break;
  }

  return sorted;
}

/**
 * Generate comparison table
 */
function generateComparison(models, workload) {
  const comparison = {
    pricing: {
      headers: ['Model', 'Prompt/1M', 'Completion/1M', 'Total/1M'],
      rows: models.map(m => [
        m.name,
        `$${m.pricing.prompt_per_1m.toFixed(2)}`,
        `$${m.pricing.completion_per_1m.toFixed(2)}`,
        `$${m.pricing.total_per_1m.toFixed(2)}`,
      ]),
    },
    capabilities: {
      headers: ['Model', 'Context', 'Vision', 'Tools', 'Reasoning'],
      rows: models.map(m => [
        m.name,
        m.context_length.toLocaleString(),
        m.architecture?.input_modalities?.includes('image') ? '✓' : '✗',
        m.supported_parameters?.includes('tools') ? '✓' : '✗',
        m.supported_parameters?.includes('reasoning') ? '✓' : '✗',
      ]),
    },
  };

  if (workload) {
    const costs = models.map(m => {
      const formatted = formatModelData(m);
      const cost = calculateCost(formatted, workload);
      return { model: m, cost };
    });

    comparison.cost_estimate = {
      headers: ['Model', 'Total Cost', 'Per Request'],
      rows: costs.map(({ model, cost }) => [
        model.name,
        `$${cost.total.toFixed(4)}`,
        cost.per_request ? `$${cost.per_request.toFixed(6)}` : 'N/A',
      ]),
      cheapest: costs.reduce((min, curr) =>
        curr.cost.total < min.cost.total ? curr : min
      ).model.id,
    };
  }

  // Find cheapest
  const cheapest = models.reduce((min, curr) => {
    const minTotal = parsePrice(min.pricing.prompt) + parsePrice(min.pricing.completion);
    const currTotal = parsePrice(curr.pricing.prompt) + parsePrice(curr.pricing.completion);
    return currTotal < minTotal ? curr : min;
  });

  comparison.summary = {
    cheapest: cheapest.id,
    highest_context: models.reduce((max, curr) =>
      curr.context_length > max.context_length ? curr : max
    ).id,
    most_capable: models.reduce((max, curr) =>
      (curr.supported_parameters?.length || 0) > (max.supported_parameters?.length || 0) ? curr : max
    ).id,
  };

  return comparison;
}

/**
 * Tool: consider_models
 */
async function considerModels(params) {
  const { models: rawModels, cache_age, cached } = await fetchModels(params.force_refresh);

  // Parse natural language request
  const intent = parseRequest(params.request || '');

  // Merge filters
  const combinedFilters = { ...intent.filters, ...params.filters };

  // Apply filters
  let filtered = applyFilters(rawModels, combinedFilters);

  // If specific model IDs provided, filter to those
  if (params.model_ids && params.model_ids.length > 0) {
    filtered = filtered.filter(m =>
      params.model_ids.some(id =>
        m.id === id || m.canonical_slug === id || m.id.toLowerCase() === id.toLowerCase()
      )
    );
  }

  // Search if terms detected
  let searchResults = filtered;
  if (intent.search_terms.length > 0) {
    const scored = searchModels(filtered, intent.search_terms);
    scored.sort((a, b) => b.score - a.score);
    searchResults = scored.map(s => s.model);
  }

  // Sort
  const sortBy = params.sort_by || intent.sort_preference || 'relevance';
  const sorted = sortModels(searchResults, sortBy);

  // Format models
  const formatted = sorted.map(formatModelData);

  // Calculate costs if workload provided
  if (params.workload) {
    formatted.forEach(model => {
      model.estimated_cost = calculateCost(model, params.workload);
    });
  }

  // Limit results
  const maxResults = params.max_results || 10;
  const results = formatted.slice(0, maxResults);

  // Build response
  const response = {
    interpretation: {
      understood_as: intent.understood_as || 'model listing',
      applied_filters: combinedFilters,
      search_strategy: intent.search_terms.length > 0 ? 'keyword search' : 'filtered list',
      search_terms: intent.search_terms,
    },
    models: results.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      context_length: m.context_length,
      pricing: {
        prompt_per_1m: m.pricing.prompt_per_1m,
        completion_per_1m: m.pricing.completion_per_1m,
        total_per_1m: m.pricing.total_per_1m,
      },
      capabilities: getCapabilities({
        architecture: { input_modalities: m.input_modalities },
        supported_parameters: m.supported_parameters
      }),
      is_free: m.is_free,
      estimated_cost: m.estimated_cost,
    })),
    total_models_found: formatted.length,
    models_returned: results.length,
    cache_age: cached ? cache_age : undefined,
  };

  // Add comparison if comparing specific models
  if (params.model_ids && params.model_ids.length > 1) {
    response.comparison = generateComparison(
      sorted.slice(0, params.model_ids.length),
      params.workload
    );
  }

  // Add cost analysis if workload provided
  if (params.workload && results.length > 0) {
    const costs = results
      .filter(m => m.estimated_cost)
      .map(m => ({ id: m.id, cost: m.estimated_cost.total }))
      .sort((a, b) => a.cost - b.cost);

    if (costs.length > 0) {
      response.cost_analysis = {
        cheapest_option: costs[0],
        most_expensive_option: costs[costs.length - 1],
        potential_savings: costs[costs.length - 1].cost - costs[0].cost,
      };
    }
  }

  return response;
}

/**
 * Initialize MCP Server
 */
const server = new Server(
  {
    name: 'model-scout-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_model',
        description: 'Get complete details for a specific model by ID, including API endpoint information',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'string',
              description: 'Model ID, canonical slug, or name to look up',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'consider_models',
        description: 'Explore, compare, and analyze models based on requirements. Handles filtering, searching, comparison, cost analysis, and recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            request: {
              type: 'string',
              description: 'Natural language description of what you need (e.g., "cheap instructional model", "models with vision", "compare Claude vs GPT")',
            },
            filters: {
              type: 'object',
              description: 'Optional structured filters',
              properties: {
                provider: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ],
                  description: 'Filter by provider name(s)',
                },
                free_only: {
                  type: 'boolean',
                  description: 'Only show free models',
                },
                min_context: {
                  type: 'number',
                  description: 'Minimum context length',
                },
                max_context: {
                  type: 'number',
                  description: 'Maximum context length',
                },
                max_price_per_1m: {
                  type: 'number',
                  description: 'Maximum total cost per 1M tokens',
                },
                has_vision: {
                  type: 'boolean',
                  description: 'Must support image input',
                },
                has_tools: {
                  type: 'boolean',
                  description: 'Must support function/tool calling',
                },
                has_reasoning: {
                  type: 'boolean',
                  description: 'Must support chain-of-thought reasoning',
                },
                modality: {
                  type: 'string',
                  description: 'Filter by modality (e.g., "text->text", "text+image->text")',
                },
              },
            },
            model_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific model IDs to compare (if comparing specific models)',
            },
            workload: {
              type: 'object',
              description: 'Optional cost calculation scenario',
              properties: {
                prompt_tokens: {
                  type: 'number',
                  description: 'Number of input tokens',
                },
                completion_tokens: {
                  type: 'number',
                  description: 'Number of output tokens',
                },
                requests_per_day: {
                  type: 'number',
                  description: 'Number of requests per day',
                },
                requests_per_month: {
                  type: 'number',
                  description: 'Number of requests per month',
                },
                images: {
                  type: 'number',
                  description: 'Number of images',
                },
              },
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of models to return (default: 10)',
            },
            sort_by: {
              type: 'string',
              enum: ['price', 'context', 'created', 'name', 'relevance'],
              description: 'How to sort results',
            },
            force_refresh: {
              type: 'boolean',
              description: 'Force refresh cache (bypass 10-minute cache)',
            },
          },
          required: ['request'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'get_model': {
        const result = await getModel(args.model_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'consider_models': {
        const result = await considerModels(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start server
 */
async function main() {
  if (!OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY environment variable is required');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Model Scout MCP server running on stdio');
}

main();
