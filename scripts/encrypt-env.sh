#!/bin/bash
set -e

ENV_FILE="${1:-.env}"
ENCRYPTED_FILE="${ENV_FILE}.enc"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File $ENV_FILE not found"
  exit 1
fi

echo "🔒 Encryption of $ENV_FILE towards $ENCRYPTED_FILE..."
sops --encrypt --age $(grep "public key:" ~/.config/sops/age/keys.txt | awk '{print $4}') \
  --input-type dotenv --output-type dotenv \
  "$ENV_FILE" > "$ENCRYPTED_FILE"

echo "✅ Encrypted file : $ENCRYPTED_FILE"
echo "💡 This file can be committed to Git"