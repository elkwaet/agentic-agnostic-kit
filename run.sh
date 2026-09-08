#!/bin/bash
# Lanceur interactif pour agentic-agnostic-kit.
# Demande dry-run ou execution reelle avant de lancer `init`, plutot que
# d'obliger a retenir le flag --dry-run a chaque fois.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI="$SCRIPT_DIR/bin/cli.js"

if [ ! -f "$CLI" ]; then
  echo "Introuvable: $CLI" >&2
  exit 1
fi

echo "agentic-agnostic-kit — lanceur"
echo "  1) Dry-run   (apercu complet, aucune ecriture sur disque)"
echo "  2) Reel      (wizard interactif, confirmation par fichier)"
read -r -p "Choix [1-2]: " choice

case "$choice" in
  1)
    exec node "$CLI" init --dry-run "$@"
    ;;
  2)
    exec node "$CLI" init "$@"
    ;;
  *)
    echo "Choix invalide, rien lance." >&2
    exit 1
    ;;
esac
