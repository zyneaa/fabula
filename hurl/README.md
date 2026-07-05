# Hurl API Tests

CLI-first HTTP client for Fabula API.

## Setup

```bash
# Install hurl
brew install hurl

# Edit credentials
vim hurl/hurl.env
```

## Usage

```bash
# Register user
hurl --variables-file hurl/hurl.env hurl/register.hurl

# Login (saves token to hurl/token.json)
hurl --variables-file hurl/hurl.env hurl/login.hurl

# Extract token and set as env var
export access_token=$(cat hurl/token.json | jq -r '.access_token')

# Run requests with token
hurl --variable access_token=$access_token --variable material_id=1 hurl/list-materials.hurl

# Upload material
hurl --variable access_token=$access_token --variable file_path=./test.pdf hurl/upload-material.hurl
```

## Files

- `hurl.env` - credentials (edit before use)
- `login.hurl` - login, outputs token to `token.json`
- `register.hurl` - register new user
- `upload-material.hurl` - upload file (requires `file_path` variable)
- `list-materials.hurl` - list all materials
- `get-material.hurl` - get material with chunks (requires `material_id`)
- `delete-material.hurl` - delete material (requires `material_id`)
