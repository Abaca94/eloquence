#!/bin/zsh
# Lancer Éloquence — démarre un petit serveur local et ouvre l'application.
# (Le micro de Chrome exige une adresse http://localhost : c'est le rôle de ce script.)
cd "$(dirname "$0")"
PORT="${ELOQUENCE_PORT:-8734}"
URL="http://localhost:$PORT"

echo "Éloquence se lance sur $URL …"
echo "Laissez cette fenêtre ouverte pendant la session. Pour tout arrêter : Cmd+Q ou Ctrl+C."

(
  sleep 1
  if open -a "Google Chrome" "$URL" 2>/dev/null; then sleep 0.5
  elif open -a "Safari" "$URL" 2>/dev/null; then echo "Note : sous Safari, autorisez le micro (Réglages › Sites Web › Micro)."
  else open "$URL"; fi
) &

python3 -m http.server "$PORT"
