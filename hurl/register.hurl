POST {{base_url}}/auth/register
Content-Type: application/json
{
  "email": "{{email}}",
  "password": "{{password}}",
  "name": "{{name}}",
  "role": "student"
}
HTTP 201
