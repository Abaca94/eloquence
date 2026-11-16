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

## Les quatre modules

| Module | Ce que vous y travaillez |
|---|---|
| **Forge phonétique** | Phrases classées en 5 axes (pièges sonores FR→EN, technique, business, rythme & liaisons, chiffres/dates US). Écoute du modèle (voix normale ou lente), puis production au micro : score par mot, mots réussis / ratés / décalés, conseils de spécialiste. |
| **Tête-à-tête** | 5 scénarios professionnels à embranchements : kick-off de projet, appel client incident, Q&A technique après présentation, petit talk en conférence, négociation de contrat. Vous répondez à voix haute ou au clavier ; l'agent reconnaît vos formulations (indices à la demande), corrige et vous félicite. |
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

- `index.html`, `styles.css`, `js/app.js`, `js/data.js` — l'application, sans dépendances.
- `js/data.js` — la banque de contenu (phrases, scénarios, nuances) : modifiable
  librement pour ajouter vos propres phrases de vos domaines de spécialité.

## Navigation au clavier (Prononciation)

- `Espace` maintenu = enregistrer ; relâcher = stopper.
- `←` / `→` avec la souris sur boutons de navigation de phrase.
