POST {{base_url}}/materials
Authorization: Bearer {{access_token}}
Content-Type: multipart/form-data
[FormParams]
file: file,{{file_path}}
HTTP 201
