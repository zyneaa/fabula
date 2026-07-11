PUT {{base_url}}/uni-info/{{uni_info_id}}
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "category": "{{category}}",
  "title": "{{title}}",
  "content": "{{content}}",
  "metadata_json": {{metadata_json}}
}

HTTP 200
