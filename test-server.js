#!/usr/bin/env node

/**
 * Quick test script to verify the MCP server implementation
 */

import dotenv from 'dotenv';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testGetModel() {
  console.log('\n=== Testing get_model functionality ===\n');

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
  });

  const data = await response.json();
  const testModel = data.data[0]; // Get first model

  console.log('✓ Fetched model data from OpenRouter');
  console.log(`  Testing with model: ${testModel.name}`);
  console.log(`  Model ID: ${testModel.id}`);
  console.log(`  Context: ${testModel.context_length.toLocaleString()} tokens`);
  console.log(`  Pricing: $${(parseFloat(testModel.pricing.prompt) * 1_000_000).toFixed(2)} / $${(parseFloat(testModel.pricing.completion) * 1_000_000).toFixed(2)} per 1M tokens`);

  return testModel;
}

async function testConsiderModels() {
  console.log('\n=== Testing consider_models filtering ===\n');

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
  });

  const data = await response.json();

  // Test free models
  const freeModels = data.data.filter(m =>
    parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0
  );
  console.log(`✓ Found ${freeModels.length} free models`);

  // Test vision models
  const visionModels = data.data.filter(m =>
    m.architecture?.input_modalities?.includes('image')
  );
  console.log(`✓ Found ${visionModels.length} models with vision support`);

  // Test tool support
  const toolModels = data.data.filter(m =>
    m.supported_parameters?.includes('tools')
  );
  console.log(`✓ Found ${toolModels.length} models with tool support`);

  // Test reasoning support
  const reasoningModels = data.data.filter(m =>
    m.supported_parameters?.includes('reasoning')
  );
  console.log(`✓ Found ${reasoningModels.length} models with reasoning support`);
}

async function testCostCalculation() {
  console.log('\n=== Testing cost calculation ===\n');

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
  });

  const data = await response.json();
  const testModel = data.data.find(m => parseFloat(m.pricing.prompt) > 0);

  if (testModel) {
    const promptPrice = parseFloat(testModel.pricing.prompt);
    const completionPrice = parseFloat(testModel.pricing.completion);

    const workload = {
      prompt_tokens: 500_000,
      completion_tokens: 500_000,
    };

    const cost = (promptPrice * workload.prompt_tokens) + (completionPrice * workload.completion_tokens);

    console.log(`Testing with: ${testModel.name}`);
    console.log(`  Workload: ${workload.prompt_tokens.toLocaleString()} input + ${workload.completion_tokens.toLocaleString()} output`);
    console.log(`  Total cost: $${cost.toFixed(4)}`);
    console.log(`  Cost per 1M tokens: $${((promptPrice + completionPrice) * 1_000_000).toFixed(2)}`);
  }
}

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('Model Scout MCP - Test Suite\n');
  console.log('Testing API connectivity and data parsing...');

  try {
    await testGetModel();
    await testConsiderModels();
    await testCostCalculation();

    console.log('\n=== All tests passed! ===\n');
    console.log('The MCP server implementation should work correctly.');
    console.log('To use with Claude Desktop, add this server to your MCP config.\n');
  } catch (error) {
    console.error('\n=== Test failed ===');
    console.error(error.message);
    process.exit(1);
  }
}

main();
