POST {{base_url}}/llm-configs
Authorization: Bearer {{access_token}}
Content-Type: application/json
{
  "provider": "openrouter",
  "model_name": "openai/gpt-4o",
  "is_active": true,
  "max_tokens": 4000
}
HTTP 201
