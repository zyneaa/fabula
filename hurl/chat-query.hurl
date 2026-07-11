POST {{base_url}}/chat/conversations/{{conversation_id}}/query
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "query": "{{query}}"
}

HTTP 200
