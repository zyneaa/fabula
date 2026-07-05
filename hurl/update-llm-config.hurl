PUT {{base_url}}/llm-configs/{{config_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json
{
  "is_active": true,
  "max_tokens": 8000
}
HTTP 200
