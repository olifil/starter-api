#!/bin/bash
set -e

ENCRYPTED_FILE="${1:-.env.enc}"
ENV_FILE="${ENCRYPTED_FILE%.enc}"

if [ ! -f "$ENCRYPTED_FILE" ]; then
  echo "❌ Fil $ENCRYPTED_FILE not found"
  exit 1
fi

if [ ! -f ~/.config/sops/age/keys.txt ]; then
  echo "❌ Age key not found in ~/.config/sops/age/keys.txt"
  echo "💡 Ask a team member for the key"
  exit 1
fi

echo "🔓 Decryption of $ENCRYPTED_FILE towards $ENV_FILE..."
sops --decrypt --input-type dotenv --output-type dotenv \
  "$ENCRYPTED_FILE" > "$ENV_FILE"

echo "✅ Decrypted file : $ENV_FILE"