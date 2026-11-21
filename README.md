# Éloquence — Atelier d'anglais oral (C1/C2 · anglais américain)

Application **100 % locale** pour perfectionner l'expression orale d'une traductrice
technique : prononciation corrigée, conversations professionnelles et nuances
de vocabulaire — sans abonnement, sans compte, sans IA en ligne.

## Démarrage

Double-cliquez sur « **Lancer Éloquence.command** ».
Il démarre un petit serveur local et ouvre l'application dans votre navigateur
(Chrome de préférence : sa reconnaissance vocale fournit le meilleur retour).
Laissez la fenêtre du Terminal ouverte pendant la session ; Ctrl+C ou Cmd+Q
pour tout arrêter.

**Première fois** : le navigateur demandera l'autorisation d'utiliser le
microphone — acceptez. La reconnaissance vocale des navigateurs nécessite une
connexion Internet (le son part chez Google/Apple pour être transcrit) ; tout
le reste — contenu, progression, dialogue — reste sur votre machine.

## Sur iPhone et iPad

L'app est publiée sur GitHub Pages (adresse https). Ouvrez-la dans Safari, puis
**Partager › Sur l'écran d'accueil**. Elle s'ouvre alors comme une app, en plein
écran, et fonctionne hors ligne après la première ouverture (sauf la
reconnaissance vocale, qui passe par Apple). La progression est gardée
séparément sur chaque appareil.

## Analyse son par son (Forge phonétique)

Dans la Forge phonétique, le bouton **Télécharger le modèle** installe une fois
pour toutes un modèle de reconnaissance des sons (wav2vec2 « espeak-cv-ft » de
Meta, version allégée de 240 Mo, depuis huggingface.co). Ensuite tout se passe
sur l'appareil, même hors ligne : votre voix n'est envoyée nulle part.

L'app compare chaque son prononcé à la transcription attendue (`js/phonemes.js`)
et signale sur le mot ce qui a été entendu à la place, avec un conseil :
[θ] dit [s], [ð] dit [z], [ɪ] dit [iː], h avalé, voyelle trop ouverte…
Les voyelles réduites (schwa) et celles des petits mots grammaticaux ne sont pas
notées, car leur forme pleine reste correcte. Le modèle se supprime dans ⚙.

**Fiabilité mesurée** (300 phrases d'adultes non natifs annotées son par son,
corpus speechocean762, et 73 phrases de locuteurs natifs, LibriSpeech) :
chez un natif, environ 1 son sur 200 est signalé à tort ; chez un non-natif,
environ la moitié des sons signalés correspondent aux erreurs relevées par les
annotateurs, et l'essentiel des autres sont des [θ]→[s] ou [ð]→[z] qu'ils ont
tolérés. L'accent tonique n'est **pas** évalué : l'essai (durée × énergie de la
voyelle) signalait à tort un mot sur six chez les natifs.

L'analyse prend quelques secondes par phrase (un seul cœur de calcul est
disponible pour une page web hébergée sur GitHub Pages).

Pour ajouter ou modifier des phrases : éditez `js/data.js`, puis régénérez les
transcriptions avec `python3 tools/gen_phonemes.py` (nécessite `espeak-ng`).
Une phrase sans transcription garde l'ancienne notation mot par mot.

## Les modules

| Module | Ce que vous y travaillez |
|---|---|
| **Forge phonétique** | Phrases classées en 5 axes (pièges sonores FR→EN, technique, business, rythme & liaisons, chiffres/dates US). Écoute du modèle (voix normale ou lente), puis production au micro : score par mot, mots réussis / ratés / décalés, conseils de spécialiste. |
| **Tête-à-tête** | 8 scénarios professionnels : kick-off de projet, appel client incident, questions après une présentation, conversation en conférence, négociation de contrat, ambiguïté à lever avec un ingénieur, délai raccourci à refuser, critique de traduction à gérer. Vous répondez à voix haute ou au clavier ; l'agent reconnaît vos formulations (indices à la demande). Après chaque réplique, un retour détaillé : sens (pertinence), formulation (calques du français, registre, tournure native), grammaire (correcteur Harper exécuté dans le navigateur) et prononciation son par son (si le modèle est installé). Bilan en fin de conversation. |
| **Coach** | Tapez n'importe quel mot ou courte expression (100 000 mots). Prononciation : transcription API avec syllabe accentuée, comment produire chaque son difficile, conseils propres au mot (accent tonique, th sourd ou sonore, h, finales sonores, -ed, lettres muettes), écoute normale et lente avec la voix Heart, notation son par son, paires minimales (three/free/tree) avec exercice d'écoute, phrases en contexte. Sens : définitions WordNet, traductions françaises WOLF, synonymes, exemples, faux amis (≈70), familles de mots à ne pas confondre (≈30) avec phrases à trous, exercices générés. ☆ ajoute le mot à « Mes mots difficiles », repris dans la séance du jour. |
| **Nuances** | Oreille discriminante (ship/sheep, cart/card…), registre juste (réponses professionnelles vs familiarité vs bureaucratese), synonymes techniques, collocations américaines. |
| **Progression** | Niveaux « métier » (Conversante → Maîtresse de l'oral),⭐ fidélité, série de jours, force de chaque axe en pourcentage. |

## Design adulte, apprentissage sérieux

- Objectif quotidien personnalisable (Réglages ⚙).
- Voix américaine sélectionnable, vitesse réglable.
- Aucune mascotte, aucun compteur de cœurs punitive : les erreurs rapportent
  aussi des points (3 ⭐) car elles sont de l'information.
- Tout est conservé dans le stockage local du navigateur. « Progression »
  permet de tout réinitialiser.

## Fichiers

- `index.html`, `styles.css`, `js/app.js`, `js/data.js` — l'application.
- `js/phoneme.js` — l'analyse son par son (onnxruntime-web chargé à la demande depuis jsDelivr, puis gardé hors ligne).
- `js/phonemes.js` — transcriptions attendues, générées par `tools/gen_phonemes.py`.
- `js/coach.js`, `js/coach-data.js` — le Coach ; `js/critique.js` — le retour détaillé des dialogues.
- `coach/` — données du Coach : `lex.json` (prononciations CMUdict/eSpeak + rang de fréquence), `sense/*.json` (WordNet + WOLF),
  `kokoro-int8.onnx` + `heart.bin` + `vocab.json` (voix Kokoro, téléchargée à la demande, 92 Mo). Régénération : `tools/coach/`
  (`build_lex.py`, `aug_lex.py`, `aug2.py`, `build_sense.py`).
- `js/data.js` — la banque de contenu (phrases, scénarios, nuances) : modifiable
  librement pour ajouter vos propres phrases de vos domaines de spécialité.

## Navigation au clavier (Prononciation)

- `Espace` maintenu = enregistrer ; relâcher = stopper.
- `←` / `→` avec la souris sur boutons de navigation de phrase.

## Licences des données

- Voix : Kokoro-82M (hexgrad), Apache 2.0, exécutée avec onnxruntime-web (MIT).
- Prononciations : CMU Pronouncing Dictionary (BSD) et eSpeak NG (GPL v3, utilisé hors ligne pour générer les fichiers).
- Fréquences : FrequencyWords (Hermit Dave, MIT), d'après OpenSubtitles.
- Sens : Princeton WordNet 3.0 (licence WordNet) ; Open English WordNet (CC BY 4.0) pour la liste des lemmes.
- Traductions : WOLF (Sagot et Fišer), CeCILL-C, via Open Multilingual Wordnet 1.4.
- Grammaire : Harper (Automattic), Apache 2.0, chargé depuis jsDelivr puis gardé hors ligne.
- Polices : Gentium Book Plus (SIL International) et Instrument Sans, SIL Open Font License 1.1, hébergées dans `fonts/`.
