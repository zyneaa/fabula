POST {{base_url}}/llm-configs
Authorization: Bearer {{access_token}}
Content-Type: application/json
{
  "name": "Free",
  "provider": "tencent",
  "model_name": "tencent/hy3:free",
  "is_active": true,
  "max_tokens": 4000
}
HTTP 201
