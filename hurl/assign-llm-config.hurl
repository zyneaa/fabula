POST {{base_url}}/llm-configs/assign
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "student_id": {{student_id}},
  "config_id": {{config_id}}
}

HTTP 201
