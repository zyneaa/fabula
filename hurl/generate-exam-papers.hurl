POST {{base_url}}/exam-papers/generate
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "course_material_id": {{course_material_id}},
  "source_exam_id": {{source_exam_id}},
  "course_id": "{{course_id}}",
  "num_papers": {{num_papers}}
}

HTTP 202
