POST {{base_url}}/users
Authorization: Bearer {{access_token}}
Content-Type: application/json
{
  "email": "{{new_user_email}}",
  "password": "{{new_user_password}}",
  "name": "{{new_user_name}}",
  "role": "{{new_user_role}}"
}
HTTP 201
