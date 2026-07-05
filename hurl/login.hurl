POST {{base_url}}/auth/login
Content-Type: application/json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
HTTP 200
[Captures]
access_token: jsonpath "$.access_token"

