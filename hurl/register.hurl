POST {{base_url}}/users
Authorization: Bearer {{access_token}}
Content-Type: application/json
{
  "email": "{{email}}",
  "password": "{{password}}",
  "name": "{{name}}",
  "role": "{{role}}"
}
HTTP 201
