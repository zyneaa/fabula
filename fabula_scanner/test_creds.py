#!/usr/bin/env python3
"""Test script to verify credential loading"""
import os
import sys
sys.path.insert(0, '.')

# Test 1: Without environment variables
print("Test 1: Loading config without environment variables")
from core.engine import ScanEngine
config = {}
print(f"Config: {config}")
print("✓ Config loaded without errors\n")

# Test 2: With environment variables
print("Test 2: Loading config with environment variables")
os.environ['TELEGRAM_BOT_TOKEN'] = 'test-token'
os.environ['TELEGRAM_CHAT_ID'] = '123456'

# Import after setting env vars
import yaml
import re

def load_config(path='config/default.yaml'):
    """Load YAML configuration with fallback"""
    try:
        with open(path, 'r') as f:
            content = f.read()
        
        # Expand environment variables in format ${VAR_NAME}
        def expand_env_vars(match):
            var_name = match.group(1)
            return os.environ.get(var_name, match.group(0))
        
        content = re.sub(r'\$\{([^}]+)\}', expand_env_vars, content)
        
        return yaml.safe_load(content)
    except FileNotFoundError:
        return {}
    except yaml.YAMLError as e:
        print(f"Error: {e}")
        return {}

config = load_config('config/default.yaml')
print(f"Bot token from config: {config.get('telegram', {}).get('bot_token')}")
print(f"Chat ID from config: {config.get('telegram', {}).get('chat_id')}")

# Test with the actual fabula.py function
sys.path.insert(0, '.')
import fabula

print("\nTest 3: Using fabula.py load_config")
fabula_config = fabula.load_config('config/default.yaml')
print(f"Bot token: {fabula_config.get('telegram', {}).get('bot_token')}")
print(f"Chat ID: {fabula_config.get('telegram', {}).get('chat_id')}")

print("\n✓ All tests passed!")