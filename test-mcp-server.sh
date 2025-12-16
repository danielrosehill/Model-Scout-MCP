#!/bin/bash

# Test script for Model Scout MCP server
# This simulates how Claude Desktop would communicate with the MCP server

echo "Testing Model Scout MCP Server"
echo "==============================="
echo ""

# Check if API key is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "❌ Error: OPENROUTER_API_KEY environment variable is not set"
    echo "   Set it with: export OPENROUTER_API_KEY=your-key-here"
    exit 1
fi

echo "✓ API key is set"
echo ""

# Test 1: List tools
echo "Test 1: Requesting available tools"
echo "-----------------------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js 2>/dev/null | head -20
echo ""

# Test 2: Call get_model tool
echo "Test 2: Calling get_model tool"
echo "-------------------------------"
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_model","arguments":{"model_id":"openai/gpt-4"}}}' | timeout 5 node index.js 2>/dev/null | head -30
echo ""

# Test 3: Call consider_models tool
echo "Test 3: Calling consider_models tool (free models)"
echo "---------------------------------------------------"
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"consider_models","arguments":{"request":"free models","max_results":3}}}' | timeout 5 node index.js 2>/dev/null | head -40
echo ""

echo "==============================="
echo "Tests completed!"
echo ""
echo "Note: The server is designed to run continuously via stdio."
echo "In Claude Desktop, it will keep running and handle multiple requests."
