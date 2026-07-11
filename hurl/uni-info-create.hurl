POST {{base_url}}/uni-info/
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "category": "{{category}}",
  "title": "{{title}}",
  "content": "{{content}}",
  "metadata_json": {{metadata_json}}
}

HTTP 200
