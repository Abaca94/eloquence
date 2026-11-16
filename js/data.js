/* ============================================================
   Éloquence — banque de contenu (C1/C2 · anglais américain)
   Tout est local : aucune donnée ne quitte votre machine.
   ============================================================ */

const VARIETY = "US"; // anglais américain

/* ---------- 1. FORGE PHONÉTIQUE ---------- */
const PHONEME_FILTERS = [
  { id: "trap",     label: "Pièges sonores FR→EN" },
  { id: "tech",     label: "Vocabulaire technique" },
  { id: "business", label: "Business & appels d'offres" },
  { id: "flow",     label: "Chaîne connectée & rythme" },
  { id: "numbers",  label: "Chiffres, dates & unités (US)" },
];
const PHONEME_FILTER_LABELS = {
  trap: "Pièges sonores", tech: "Technique",
  business: "Business", flow: "Rythme", numbers: "Chiffres & dates"
};

const PHRASES = [
  /* --- Pièges sonores avancés --- */
  { f: "trap",
    en: "Although the verdict was thorough, the authorities breezed through the audit.",
    fr: "Bien que le verdict ait été approfondi, les autorités ont survolé l'audit.",
    focus: "θ / ð + voyelles [iː] vs [ɪ]",
    tip: "« Thorough » : th + plusieurs voyelles, le mot s'étire. « Breezed » [iː] long et tendu, ne le confondez pas avec « brief » [iː] + [f] final. À ce niveau, ce sont les micro-écarts qui plafonnent votre score." },
  { f: "trap",
    en: "The harness had withstood far worse than what we'd anticipated.",
    fr: "Le harnais avait résisté à bien pire que ce que nous avions prévu.",
    focus: "/h/ aspiré + « withstood »",
    tip: "« Withstood » : ni [wizuː] ni [wizoud] — [wɪθstuːd], th-sourde au milieu. « What we'd » se réduit à [wət wid] : la langue anglaise économise sans s'embarrasser." },
  { f: "trap",
    en: "We verified whether the bearing would withhold under the anticipated axial load.",
    fr: "Nous avons vérifié si le palier tiendrait sous la charge axiale prévue.",
    focus: "withhold / withstand / weather",
    tip: "Les « with- » : withhold, withstand, weather. Chacun a son identité phonétique précise. Alternez-les à voix haute : c'est exactement le genre de famille lexicale qui déclenche des glissements de langue à l'oral." },
  { f: "trap",
    en: "Let's put this wording on hold until the warranty clause is validated.",
    fr: "Mettons cette formulation en attente jusqu'à la validation de la clause de garantie.",
    focus: "/w/ purs + /ɜː/",
    tip: "« Wording », « warranty », « work » : la même voyelle centrale longue. Ne la colorez pas en [ɛ] ou [ə] français. Pour un W anglais : lèvres déjà arrondies avant de souffler — jamais de vibration ni de friction labiale." },
  { f: "trap",
    en: "The hurdle isn't the hardware; it's the liability coverage.",
    fr: "Le véritable obstacle n'est pas le matériel : c'est la couverture de responsabilité.",
    focus: "Groupes internes /h/ + /l/",
    tip: "« Hurdle » et « hardware » : le h souffle vraiment, mais en anglais américain seul « hurdle » est un obstacle ; « hurdle » ≠ « hurtle », attention au sens comme au son." },
  { f: "trap",
    en: "Rather than rewrite the clause outright, we'll phase the changes in.",
    fr: "Plutôt que de réécrire la clause d'un coup, nous allons échelonner les changements.",
    focus: "Hedges de pro + « outright »",
    tip: "« Rather than », « phase in » : formules fluides du professionnel anglophone. Le mot « outright » porte une diphtongue [aʊ] — pas de [u] français, le passage a→u doit être audible." },

  /* --- Vocabulaire technique (US) --- */
  { f: "tech",
    en: "The bracket's fatigue life is far shorter than the datasheet suggests.",
    fr: "La durée de vie en fatigue de l'équerre est bien plus courte que ce qu'indique la fiche technique.",
    focus: "Groupes de 3+ consonnes",
    tip: "« Bracket », « fatigue », « datasheet », « suggests » [sədʒɛsts — quatre consonnes en finale !]. Isolez : un groupe consonantique à la fois, à vitesse ralentie, avant de monter le tempo." },
  { f: "tech",
    en: "Thermal cycling accounts for roughly half of the observed degradation.",
    fr: "Les cycles thermiques expliquent environ la moitié de la dégradation observée.",
    focus: "« roughly », « observed »",
    tip: "« Roughly » [rʌfli] : pas de [ou] français. « Accounts for » : liaison rapide [əˈkaʊnsfɚ]. À l'oral professionnel américain, ce sont les mots grammaticaux invisibles qui créent la fluidité perçue." },
  { f: "tech",
    en: "We ran into an edge case the regression suite hadn't flagged.",
    fr: "Nous sommes tombés sur un cas limite que la suite de régression n'avait pas détecté.",
    focus: "Réductions de mots faibles",
    tip: "À l'oral américain : « ran into an edge case » = [rænɪnə nɛdʒkeɪs], et « hadn't » [hædənt]. À l'écrit on éviterait, mais à l'oral une pro anglophone parle précisément comme ça — détachez la vitesse de la complaisance." },
  { f: "tech",
    en: "The torque spec calls for forty-two foot-pounds — no more, no less.",
    fr: "Le couple spécifié demande 42 livres-pied — ni plus, ni moins.",
    focus: "Spécifications US + unités",
    tip: "« Spec » [spɛk] — jamais [spɛs] ni [spɛkt]. « Foot-pounds » [fʊt-paʊndz] : les unités américaines ne passent jamais en métrique à l'oral d'un site US. Enchaînez sans reprendre son souffle entre les deux mots." },
  { f: "tech",
    en: "We're seeing intermittent dropouts — the vendor is chasing it down.",
    fr: "On observe des coupures intermittentes — le fournisseur cherche la cause.",
    focus: "Registre IT oral américain",
    tip: "« Seeing », « dropouts », « chasing down » : vocabulaire vivant et idiomatique des stand-ups. « Vendor » (US) plutôt que « supplier » quand on parle d'un fournisseur de logiciels." },
  { f: "tech",
    en: "Datum shifts aside, the alignment's within tolerance — barely.",
    fr: "Mises à part les décalages de référence, l'alignement est dans la tolérance — de justesse.",
    focus: "Finale de phrase = un défi",
    tip: "« Barely » [bɛrli] en finale : ne le réduisez pas en [beli]. C'est le mot qui reverse le sens entier de la phrase. Répétez-le seul, puis à la fin de la phrase, à l'identique." },

  /* --- Business & appels d'offres (US) --- */
  { f: "business",
    en: "To be perfectly candid, I don't think we can get to eighty pages by Friday.",
    fr: "Pour être tout à fait franc, je ne pense pas qu'on puisse arriver à 80 pages d'ici vendredi.",
    focus: "Hedges de hautes fonctions",
    tip: "« To be perfectly candid », « if I may », « I'd push back on that » — boîte à outils de diplomatie professionnelle. Parlez ces formules comme un seul bloc mémorisé, sans les reconstruire mot à mot." },
  { f: "business",
    en: "Following up on Tuesday's call — here's where we stand on the deliverables.",
    fr: "Dans la continuité de l'appel de mardi — voici où nous en sommes sur les livrables.",
    focus: "Chaînes rapides",
    tip: "Réductions attendues : « here's where we » [hɪrz wɛri], « stand on the » [stændɑ̃nðə]. Dites d'abord la phrase en fonctionnalité lente, mot à mot — puis réassemblez-la dans le rythme naturel américain." },
  { f: "business",
    en: "We'd rather renegotiate the clause than risk missing the deadline.",
    fr: "Nous préférerions renégocier la clause plutôt que de risquer de manquer le délai.",
    focus: "Contraction + [æ] large",
    tip: "« We'd rather » [wid ræðɚ] : contraction non négociable à l'oral. « Rather » sur [æ], mâchoire grande ouverte et relâchée — jamais le [a] français ni le britannique [ɑː]." },
  { f: "business",
    en: "Effective immediately, late deliverables will incur a two-percent penalty.",
    fr: "Avec effet immédiat, les livrables en retard entreront une pénalité de deux pour cent.",
    focus: "Registre contractuel US",
    tip: "Rejouez « effective », « immediately », « incur », « penalty » comme une formule de contrat lue à voix haute : tempo régulier, gravité sérieuse, aucune syllabe traînante." },
  { f: "business",
    en: "Can we count on your team to turn around the spec review by end of day Friday?",
    fr: "Pouvons-nous compter sur votre équipe pour boucler la revue de spécification d'ici vendredi en fin de journée ?",
    focus: "« End of day » ≠ européen",
    tip: "« End of day » (EOD) est largement utilisé en entreprise américaine — souvent 17 h heure du client. Prononcez-le [i-n-əv-déi] : trois mots fondus en une seule respiration." },
  { f: "business",
    en: "I hear you — let me play devil's advocate for a second.",
    fr: "Je vous entends — laissez-moi jouer l'avocat du diable une seconde.",
    focus: "Idiomatique de réunion",
    tip: "« I hear you » (Je comprends / je suis d'accord) et « play devil's advocate » sont des marqueurs de C1/C2 : savoir se positionner avant de contredire. Dites-les avec confiance, sans sourire trop fort." },

  /* --- Rythme, chaîne connectée & mots faibles --- */
  { f: "flow",
    en: "I'd like to pick this up where we left off last time.",
    fr: "J'aimerais reprendre là où nous nous étions arrêtés la dernière fois.",
    focus: "Liaisons internes",
    tip: "Chaîne connectée : « pick this up », « where we left off ». À l'américaine, le d de « left » ne se prononce quasiment pas devant « off ». Laissez les syllabes faibles fondre : le rythme se sent dans les liaisons." },
  { f: "flow",
    en: "As long as the change order is signed, we're pretty much on track.",
    fr: "Du moment que l'avenant est signé, on est à peu près dans les temps.",
    focus: "Mots faibles avalés",
    tip: "« As long as the » s'épaule en une respiration fantomale, « signed » et « track » portent l'accent. « Pretty much » : réduction familière mais parfaitement acceptée entre collègues. L'anglais est une langue d'accent tonique : battez le rythme en parlant." },
  { f: "flow",
    en: "What matters isn't the invoice total — it's the payment terms.",
    fr: "Ce qui compte, ce n'est pas le total de la facture — ce sont les conditions de paiement.",
    focus: "Accent contrastif",
    tip: "AIM-total et PAY-ment en relief : plus forts, plus longs, ton légèrement plus haut. En anglais, on « souligne » à voix haute — la hauteur sonore fait le gras de l'écrit." },
  { f: "flow",
    en: "It goes without saying — we'll keep you posted every step of the way.",
    fr: "Cela va de soi — nous vous tiendrons informé à chaque étape.",
    focus: "Formules figées",
    tip: "Bloc mémorisé : « goes WITHOUT saying », « keep you POSTED », « every STEP of the way ». À ce niveau, la fluidité vient des formules pré-packagées, pas des mots isolés." },
  { f: "flow",
    en: "The fewer moving parts, the better — let's not over-engineer this.",
    fr: "Moins il y a de pièces mobiles, mieux c'est — n'en faisons pas trop.",
    focus: "Comparatif + hedges",
    tip: "« The fewer… the better » : structure comparative aux deux branches. « Over-engineer » [oʊvə-rendʒə-nɪr] : cinq syllabes américaines, accent sur la troisième. Ne le découpez pas en français." },

  /* --- Chiffres, dates, unités (US) --- */
  { f: "numbers",
    en: "The budget is one point two five million dollars — not one point five two.",
    fr: "Le budget est de 1,25 million de dollars — pas 1,52.",
    focus: "Décimales à l'américaine",
    tip: "En anglais, la virgule se dit « point » : one POINT two five. Après le point, on énumère les chiffres un par un — two-five ≠ five-two. Erreur classique, et chère." },
  { f: "numbers",
    en: "Deliveries are due on February twenty-eighth, March fifth, and April eleventh.",
    fr: "Les livraisons sont prévues le 28 février, le 5 mars et le 11 avril.",
    focus: "Dates à l'américaine : mois + ordinal",
    tip: "À l'américaine : February TWENTY-EIGHTH (mois avant le jour), jamais « the twenty-eighth of February », qui sonne britannique. « Fifth » échappe au th. « Eleventh » [ɪ-lɛ-vənθ] : trois articulations distinctes." },
  { f: "numbers",
    en: "The tolerance is plus or minus zero point zero two thousandths of an inch.",
    fr: "La tolérance est de ± 0,002 millièmes de pouce.",
    focus: "Unités US + « zero »",
    tip: "L'anglais américain, contrairement au britannique, ne dit jamais « nought » : zero point zero two. « Thousandths » [θau-zəndθs] : mot d'ingénierie difficile en finale — entraînez-le seul." },
  { f: "numbers",
    en: "We processed one hundred forty-two tickets in under a week.",
    fr: "Nous avons traité 142 tickets en moins d'une semaine.",
    focus: "Centaines sans « and » (US)",
    tip: "À l'américaine, « and » saute après hundred : one hundred FORTY-two. Utilisé en anglais britannique, ce « and » est agaçant pour une oreille US. Choisissez votre standard et n'en démordez plus." },
  { f: "numbers",
    en: "It's nine forty-five now — the call starts in fifteen.",
    fr: "Il est 9 h 45 — l'appel commence dans un quart d'heure.",
    focus: "Heures parlées US",
    tip: "À l'américaine, « nine forty-five » au lieu de « a quarter to ten » (plus britannique/écrit). « In fifteen » est une réduction familière de « in fifteen minutes » : parfaitement naturel en stand-up ou en messagerie." },
];

/* ---------- 2. TÊTE-À-TÊTE — scénarios conversationnels ---------- */
const SCENARIOS = [
  {
    id: "kickoff", icon: "⭑", title: "Conférence de lancement (kick-off)",
    context: "Vous lancez un projet de localisation pour un client industriel américain. Présentation de votre équipe et du planning.",
    nodes: {
      start: {
        bot: "Thanks for joining. Before we dive into the schedule, could you introduce yourself and tell us a bit about your background?",
        botFr: "Merci d'être là. Avant d'entrer dans le planning, pourriez-vous vous présenter et nous parler de votre parcours ?",
        hints: ["Good morning, everyone. My name is…", "I've been working as a technical translator for… years", "My area of expertise covers engineering, automotive and energy documentation"],
        branches: [
          { keywords: ["name", "translator", "experience", "years", "expertise", "translate", "background"],
            reply: "Impressive background — you've clearly seen your share of technical documentation. Out of curiosity, what would you say is your strongest domain?",
            replyFr: "Un parcours impressionnant — on voit que la documentation technique ne vous fait pas peur. Par curiosité, quel est votre domaine le plus solide ?",
            next: "n2", praise: true },
        ],
        fallback: "Let me rephrase: tell us your name, how long you've been translating, and the type of documents you usually handle.",
        fallbackFr: "Reformulons : dites-nous votre nom, depuis combien de temps vous traduisez, et le type de documents que vous traitez habituellement.",
        next: "start"
      },
      n2: {
        bot: "Makes sense. Now, the deliverables. We need the safety datasheets translated by end of month — roughly forty pages. Do you see any obstacle from your end?",
        botFr: "Très bien. Passons aux livrables. Nous avons besoin des fiches de sécurité traduites d'ici la fin du mois — environ quarante pages. Voyez-vous un obstacle de votre côté ?",
        hints: ["Forty pages is feasible, provided…", "I'd suggest breaking it into batches of…", "I don't expect any issue as long as…"],
        branches: [
          { keywords: ["feasible", "possible", "no problem", "issue", "obstacle", "concern", "batch", "schedule", "timeline", "deadline", "provided"],
            reply: "Perfect. We'll split it into four batches of ten pages, reviewed as we go. Any question about terminology?",
            replyFr: "Parfait. Nous découperons en quatre lots de dix pages, revus au fur et à mesure. Une question sur la terminologie ?",
            next: "n3", praise: true },
        ],
        fallback: "Give an assessment: « No major obstacle, provided that… » or « I would need… ».",
        fallbackFr: "Donnez une évaluation : « Pas d'obstacle majeur, à condition que… » ou « J'aurais besoin de… ».",
        next: "n2"
      },
      n3: {
        bot: "One terminology point: the client wants « control panel » rendered consistently throughout. In one sentence — how would you handle a term with no single equivalent?",
        botFr: "Un point terminologique : le client veut que « control panel » soit traduit de façon cohérente tout au long. En une phrase — comment gèreriez-vous un terme sans équivalent unique ?",
        hints: ["I would build a glossary and…", "When there's no perfect equivalent, I usually…"],
        branches: [
          { keywords: ["glossary", "consistent", "consistency", "term base", "termbase", "choice", "document", "explanation", "context"],
            reply: "That's exactly the approach I'd expect from a professional. We'll spin up a shared glossary on day one.",
            replyFr: "C'est exactement ce que j'attends d'une professionnelle. Nous créerons un glossaire partagé dès le premier jour.",
            next: "outro", praise: true },
        ],
        fallback: "Essayez : « First I would… , and then I'd document it in a glossary. »",
        fallbackFr: "Essayez : « D'abord je… , puis je le documenterais dans un glossaire. »",
        next: "n3"
      },
      outro: {
        bot: "This was a very promising conversation. I'll send you the contract draft this afternoon — and congrats on making it through your first pitch in English.",
        botFr: "Conversation très prometteuse. Je vous envoie le brouillon du contrat cet après-midi — et bravo pour votre premier pitch en anglais.",
        hints: [], branches: [], next: null, end: true
      }
    }
  },
  {
    id: "clientcall", icon: "☎", title: "Appel client : un problème technique",
    context: "Le client appelle : une pièce affiche un défaut après installation. Vous gèrez la situation par téléphone — empathie, précision, séquence.",
    nodes: {
      start: {
        bot: "Hi, this is Sarah from Belgreen Industrial. I'm afraid we have a problem with the commissioning of unit seven — the display keeps resetting. Can you help?",
        botFr: "Bonjour, c'est Sarah chez Belgreen Industrial. Nous avons un problème avec la mise en service de l'unité 7 — l'écran se réinitialise sans cesse. Pouvez-vous aider ?",
        hints: ["Good morning, Sarah. I'm sorry to hear that.", "Can you tell me exactly when it happens?", "Does it reset at startup, or while it's running?"],
        branches: [
          { keywords: ["sorry", "when", "happen", "reset", "startup", "operation", "detail", "more information", "while"],
            reply: "It started this morning, right after we powered back up. The display resets every time we switch to the diagnostics menu.",
            replyFr: "Cela a commencé ce matin, juste après le retour du courant. L'écran se réinitialise chaque fois qu'on passe au menu de diagnostic.",
            next: "n2", praise: true },
        ],
        fallback: "Show some empathy first, then ask a precise question: « When exactly does it happen? Does it reset at startup? »",
        fallbackFr: "Montrez d'abord de l'empathie, puis posez une question précise : « Quand exactement cela se produit-il ? Se réinitialise-t-il au démarrage ? »",
        next: "start"
      },
      n2: {
        bot: "Power outage this morning — that rings a bell. Would you be able to walk me through the reset procedure over the phone?",
        botFr: "Coupure de courant ce matin — cela me rappelle quelque chose. Pourriez-vous me guider pas à pas dans la procédure de réinitialisation par téléphone ?",
        hints: ["Sure. First, switch off the main breaker…", "Of course. First thing to check would be…", "Then press and hold the…"],
        branches: [
          { keywords: ["first", "then", "next", "check", "switch", "press", "hold", "restart", "breaker", "off", "wait", "sequence"],
            reply: "Done — the display is back and stable now. That was remarkably clear, thank you.",
            replyFr: "C'est fait — l'écran est revenu et stable. C'était remarquablement clair, merci.",
            next: "n3", praise: true },
        ],
        fallback: "Structure the sequence: « First… , then… , and finally… ».",
        fallbackFr: "Structurez une séquence : « D'abord… , ensuite… , et enfin… ».",
        next: "n2"
      },
      n3: {
        bot: "By the way — this is the third unit with a similar issue after a power outage. Should we be worried about the firmware?",
        botFr: "Au fait — c'est la troisième unité avec le même souci après une coupure. Devrions-nous nous inquiéter du firmware ?",
        hints: ["I'd rather not speculate, but…", "Based on my experience…", "I would recommend escalating this to…"],
        branches: [
          { keywords: ["firmware", "update", "version", "maybe", "recommend", "escalate", "engineer", "likely", "seems", "think", "could be"],
            reply: "I'll pass this to your engineering team right away. Your caution is exactly what I'd expect from a pro.",
            replyFr: "Je transmets immédiatement à votre équipe d'ingénieurs. Votre prudence est ce que j'attends d'une professionnelle.",
            next: "outro", praise: true },
        ],
        fallback: "You may speculate cautiously: « It might be… I'd recommend… ».",
        fallbackFr: "Spéculez prudemment : « C'est peut-être… Je recommanderais… ».",
        next: "n3"
      },
      outro: {
        bot: "You've been a great help today. I'll make sure to mention it. Have a good rest of your day!",
        botFr: "Vous avez été d'une grande aide aujourd'hui. Je le mentionnerai à votre responsable. Bonne fin de journée !",
        hints: [], branches: [], next: null, end: true
      }
    }
  },
  {
    id: "qanda", icon: "⌘", title: "Présentation technique + questions",
    context: "Vous venez de présenter une étude de faisabilité en anglais. Le public posera des questions pointues — défi C1/C2 : improviser avec précision.",
    nodes: {
      start: {
        bot: "Thank you for that thorough briefing. First question — you mentioned a fatigue margin of ten percent. Could you walk us through how you arrived at that figure?",
        botFr: "Merci pour ce brief très complet. Première question — vous avez évoqué une marge de fatigue de dix pour cent. Pourriez-vous nous expliquer comment vous avez obtenu ce chiffre ?",
        hints: ["Sure. The figure comes from…", "It's based on a worst-case scenario where…", "Let me break it down into three parts."],
        branches: [
          { keywords: ["based", "comes from", "derived", "worst case", "data", "test", "assumption", "analysis", "let me"],
            reply: "Thank you — that's exactly the level of rigour I was hoping for. Next question.",
            replyFr: "Merci — c'est précisément le niveau de rigueur que j'espérais. Question suivante.",
            next: "n2", praise: true },
        ],
        fallback: "Structurez la démonstration : « It's based on… , and then we factored in… ».",
        fallbackFr: "Structurez la démonstration : « Cela repose sur… , puis nous avons intégré… ».",
        next: "start"
      },
      n2: {
        bot: "Follow-up: what would change your recommendation if the client insisted on a shorter lead time? Would the safety margin hold up?",
        botFr: "Question complémentaire : si le client insistait sur un délai plus court, cela changerait-il votre recommandation ? La marge de sécurité tiendrait-elle ?",
        hints: ["That's a fair question. Off the top of my head…", "Honestly, I'd have to double-check, but…", "I'd be reluctant to commit without…"],
        branches: [
          { keywords: ["margin", "hold", "check", "double-check", "reluctant", "without", "candid", "fair", "honestly", "depending"],
            reply: "Appreciate the honesty — \"I'd have to double-check\" is a perfectly professional answer. Let's move to a slightly different angle.",
            replyFr: "Merci pour votre franchise — « Je dois vérifier » est une réponse parfaitement professionnelle. Passons à un autre angle.",
            next: "n3", praise: true },
        ],
        fallback: "It's perfectly fine not to know: « I'd have to double-check, but my initial thought is… ».",
        fallbackFr: "Vous avez le droit de ne pas savoir : « Je dois vérifier, mais a priori… ».",
        next: "n2"
      },
      n3: {
        bot: "Last one, and it's a loaded one: what's the single biggest risk you'd flag in this project, and why?",
        botFr: "Dernière question — et elle est piégée : quel serait le risque n°1 à signaler dans ce projet, et pourquoi ?",
        hints: ["If I had to pick one, it would be…", "Off the record? The scope creep.", "The real risk isn't technical — it's…"],
        branches: [
          { keywords: ["risk", "biggest", "would be", "scope", "because", "team", "timeline", "data", "candid", "honest"],
            reply: "Perfectly articulated. That's a wrap — thanks for a sharp, structured Q&A.",
            replyFr: "Parfaitement articulé. C'est terminé — merci pour un Q&A vif et structuré.",
            next: "outro", praise: true },
        ],
        fallback: "Pick ONE risk and justify it: « If I had to pick one, it would be… because… ».",
        fallbackFr: "Choisissez UN risque et justifiez-le : « Si j'en devais choisir un, ce serait… parce que… ».",
        next: "n3"
      },
      outro: {
        bot: "Excellent. I've been in this industry fifteen years, and I rarely hear non-native presenters handle Q&A with this much precision. Well done.",
        botFr: "Excellent. Je suis dans ce métier depuis quinze ans et j'entends rarement des non natifs gérer un Q&A avec autant de précision. Bien joué.",
        hints: [], branches: [], next: null, end: true
      }
    }
  },
  {
    id: "smalltalk", icon: "☕", title: "Petite conversation en conférence",
    context: "Pause café dans un salon professionnel américain. Enjeu : se montrer naturelle, construire le lien, sans surjouer.",
    nodes: {
      start: {
        bot: "Packed in here, isn't it? I'm Mark, I work in industrial automation. Have you been to this conference before?",
        botFr: "Il fait bondissant ici, n'est-ce pas ? Je suis Mark, je travaille dans l'automatisation industrielle. Vous étiez déjà venue à ce salon ?",
        hints: ["No, it's my first time here.", "Yes, I came two years ago — the keynote was excellent.", "I'm attending for the second time."],
        branches: [
          { keywords: ["first time", "before", "yes", "no", "year", "second", "time", "keynote", "attend"],
            reply: "Then you're in for a treat — the robotics track this year is supposed to be excellent. And what do you do day to day?",
            replyFr: "Vous serez gâtée — la piste robotique est réputée excellente cette année. Et vous faites quoi au quotidien ?",
            next: "n2", praise: true },
        ],
        fallback: "Answer simply: « It's my first time here — and for you? » Then say what brings you here.",
        fallbackFr: "Répondez simplement : « It's my first time here, and yours? » Puis dites ce qui vous amène.",
        next: "start"
      },
      n2: {
        bot: "A translator! I've always been curious — how do you keep up with all the technical jargon? It changes so fast.",
        botFr: "Traductrice ! J'ai toujours été curieux — comment faites-vous pour suivre tout le jargon technique ? Ça change si vite.",
        hints: ["I read a lot of specialized press…", "I keep a personal glossary of terms…", "I follow a few industry newsletters…"],
        branches: [
          { keywords: ["glossary", "read", "newsletter", "jargon", "keep up", "follow", "specialized"],
            reply: "A personal glossary — I love that. It's almost like a craft. Do you enjoy the puzzle side of it?",
            replyFr: "Un glossaire personnel — j'adore. On dirait presque un artisanat. Aimez-vous l'aspect énigme du métier ?",
            next: "n3", praise: true },
        ],
        fallback: "Describe your method: « I usually… , and I also… ».",
        fallbackFr: "Décrivez votre méthode : « D'habitude… , et aussi… ».",
        next: "n2"
      },
      n3: {
        bot: "Honestly, this has been the most interesting conversation I've had today. Would you be open to exchanging contacts? Maybe there's a project we could collaborate on.",
        botFr: "Franchement, c'est la conversation la plus intéressante de ma journée. Accepteriez-vous d'échanger nos contacts ? Peut-être avons-nous un projet commun.",
        hints: ["That would be great.", "I'd be happy to. Shall I give you my card?", "Let's keep in touch — I'll send you a message on LinkedIn."],
        branches: [
          { keywords: ["yes", "happy", "great", "card", "contact", "keep in touch", "linkedin", "email"],
            reply: "Excellent. Here's mine as well. Enjoy the rest of the conference — and do check out the robotics track, it's worth your time.",
            replyFr: "Excellent. Voici le mien également. Profitez bien du salon — et regardez la piste robotique, elle vaut votre temps.",
            next: "outro", praise: true },
        ],
        fallback: "Accept simply and warmly: « With pleasure. » or « Sure, let's keep in touch. »",
        fallbackFr: "Acceptez simplement et chaleureusement : « With pleasure. » ou « Sure, let's keep in touch. »",
        next: "n3"
      },
      outro: {
        bot: "See you around, and good luck with the rest of the day — this was a real pleasure!",
        botFr: "À bientôt, et bonne fin de journée — ce fut un vrai plaisir !",
        hints: [], branches: [], next: null, end: true
      }
    }
  },
  {
    id: "negotiation", icon: "✍", title: "Négociation d'un contrat de traduction",
    context: "Le client propose un tarif que vous jugez bas pour un dossier technique urgent. Objectif : défendre votre position avec calme et précision — défi C1/C2.",
    nodes: {
      start: {
        bot: "We've reviewed your quote. For a hundred pages, our budget tops out at twenty-five cents a word. I know it's below your usual rate — can we find a middle ground?",
        botFr: "Nous avons étudié votre devis. Pour cent pages, notre budget plafonne à 25 centimes du mot. Je sais que c'est en dessous de votre tarif habituel — peut-on trouver un terrain d'entente ?",
        hints: ["I understand your constraint, but…", "At that rate, I wouldn't be able to allocate…", "Could you tell me more about the deadline?"],
        branches: [
          { keywords: ["understand", "rate", "price", "budget", "however", "but", "quality", "allocate", "time", "hours"],
            reply: "I appreciate the frankness. Let's talk about what actually drives the cost, then.",
            replyFr: "J'apprécie votre franchise. Parlons alors de ce qui fait réellement le coût.",
            next: "n2", praise: true },
        ],
        fallback: "Defend your position with this structure: « I understand… , however… , and I would suggest… ».",
        fallbackFr: "Défendez votre position : « I understand… , however… , and I would suggest… ».",
        next: "start"
      },
      n2: {
        bot: "So what actually drives your rate? Is it the volume, the deadline, or the level of technical detail?",
        botFr: "Alors qu'est-ce qui fait vraiment monter votre tarif ? Le volume, le délai, ou le niveau de détail technique ?",
        hints: ["Mainly the deadline — a rush premium of…", "It's the engineering drawings — they require…", "Both volume and deadline play a role."],
        branches: [
          { keywords: ["deadline", "rush", "volume", "drawings", "technical", "time", "hours", "premium", "role"],
            reply: "Understood. What if we gave you two extra weeks and reduced the volume to eighty pages — would that bring the rate down to thirty cents?",
            replyFr: "Compris. Et si nous vous accordions deux semaines de plus et réduisions le volume à quatre-vingts pages — cela ramènerait-il le tarif à trente centimes ?",
            next: "n3", praise: true },
        ],
        fallback: "Name the main factor and justify it: « The main factor is… because… ».",
        fallbackFr: "Nommez le facteur principal : « The main factor is… because… ».",
        next: "n2"
      },
      n3: {
        bot: "Thirty cents, eighty pages, three weeks. Do we have a deal?",
        botFr: "Trente centimes, quatre-vingts pages, trois semaines. Sommes-nous d'accord ?",
        hints: ["Thirty cents works for me.", "I can agree to those terms.", "Let's shake on it — I'll send the revised quote today."],
        branches: [
          { keywords: ["deal", "agree", "works", "acceptable", "shake", "yes", "term", "send", "quote"],
            reply: "Excellent. I'll have the contract signed by both sides this afternoon. It's been a real pleasure doing business with you.",
            replyFr: "Excellent. Je ferai signer le contrat par les deux parties cet après-midi. Ce fut un vrai plaisir de faire affaire avec vous.",
            next: "outro", praise: true },
          { keywords: ["no", "still", "rather", "instead", "otherwise", "need"],
            reply: "Fair enough. What would still need to move for you to say yes?",
            replyFr: "C'est compréhensible. Qu'est-ce qui devrait encore bouger pour que vous disiez oui ?",
            next: "n2" },
        ],
        fallback: "Accept clearly (« We have a deal. ») or counter politely (« We're close, but I'd need… »).",
        fallbackFr: "Acceptez clairement (« We have a deal. »), ou contre-proposition polie (« We're close, but I'd need… »).",
        next: "n3"
      },
      outro: {
        bot: "Thank you for the negotiation — firm, professional and courteous. That's exactly the kind of partner we like to work with.",
        botFr: "Merci pour cette négociation — ferme, professionnelle et courtoise. C'est exactement le genre de partenaire avec qui nous aimons travailler.",
        hints: [], branches: [], next: null, end: true
      }
    }
  }
];

/* ---------- 3. NUANCES & PRÉCISION ---------- */
const NUANCE_TYPES = {
  sound: "Oreille discriminante",
  register: "Registre juste",
  synonym: "Synonymes techniques",
  colloc: "Collocations"
};
const NUANCES = [
  { type: "sound", q: "Quel mot avez-vous entendu ?", ctx: "Écoutez : en anglais, une voyelle peut changer le sens d'un ordre.",
    audio: ["ship"], options: ["ship", "sheep"],
    tip: "« Ship » [ɪ] voyelle brève relâchée, « sheep » [iː] voyelle longue tendue. En contexte technique, la différence suffit à changer un ordre." },
  { type: "sound", q: "Quel mot avez-vous entendu ?", ctx: "Piège classique : /æ/ vs /ɛ/.",
    audio: ["bad"], options: ["bad", "bed"],
    tip: "« Bad » [æ] : bouche grande ouverte et relâchée. « Bed » [ɛ] : bouche moyenne. À l'oral US, le repliement de la mâchoire distingue les deux." },
  { type: "sound", q: "Quel mot avez-vous entendu ?", ctx: "En initiale : /ð/, /z/ et /b/ se trahissent.",
    audio: ["these"], options: ["these", "sees", "bees"],
    tip: "« These » débute par un th sonore [ð] — la langue entre les dents. « Sees » par [s] sifflant, « bees » par [b] explosive bilabiale. Trois configurations très différentes." },
  { type: "sound", q: "Quel mot avez-vous entendu ?", ctx: "Vérifiez /v/ vs /b/ vs /v/ long.",
    audio: ["vest"], options: ["vest", "best", "vast"],
    tip: "« Vest » [v] : dents-lèvre avec vibration. « Best » [b] : lèvres accolées, pas de vibration. « Vast » [v] + voyelle large [æ]. Trois signatures distinctes." },
  { type: "sound", q: "Quel mot avez-vous entendu ?", ctx: "En finale, l'anglais US durcit l'articulation.",
    audio: ["cart"], options: ["cart", "card"],
    tip: "« Cart » se termine sur un [t] sourd et sec, « card » sur un [d] sonore moins sec. Notez que le r américain est rétroflexe — les États-Unis le rognent davantage que le britannique." },
  { type: "sound", q: "Quel mot avez-vous entendu ?", ctx: "La redoutable opposition /ɪ/ vs /iː/ en finale.",
    audio: ["beach"], options: ["beach", "bitch"],
    tip: "En contexte professionnel cette paire peut être humiliante : « beach » [iː] long et tendu, « bitch » [ɪ] brève et relâchée. Entraînez-la avec le sourire, jusqu'à ce que l'oreille fasse la différence seule." },

  { type: "register", q: "Lors d'un appel client, on vous demande : « Can you send it over? »",
    ctx: "Choisissez la réponse la plus naturelle à l'oral professionnel américain.",
    options: ["Sure thing, I'll send it right now.", "I shall proceed with the transmission thereof forthwith.", "Yeah, no problem, cool."],
    good: 0,
    tip: "« Sure thing, I'll send it right now » : naturel, cordial, exactement le bon niveau de langage pour un client. Le deuxième sonne plus juridique que la conversation, le troisième trop familier." },
  { type: "register", q: "Votre responsable écrit : « Any update on the spec review? »",
    ctx: "Quelle réponse peut convenir à l'oral ou à une messagerie rapide ?",
    options: ["Dear Ms. Johnson, I am writing in response to your inquiry regarding…", "I'm halfway through — the terminology section might need another day.", "Update: spec review status: pending. Will advise in due course."],
    good: 1,
    tip: "Réponse brève, orientée information, avec un « hook » sur le délai. Les deux autres ont un ton de lettre ou de note administrative — inadapté à l'oral." },
  { type: "register", q: "En réunion, on demande votre avis sur un calendrier serré.",
    ctx: "Important : signaler le risque sans dramatiser, avec assurance.",
    options: ["This schedule is ridiculous, there's no way we can make it.", "I see some risk around the tolerances — could we review the critical items first?", "It should be fine, I think, maybe, probably."],
    good: 1,
    tip: "Nommer le risque sans exagérer : « I see some risk… — could we review…? » L'anglais professionnel valorise les positions nuancées et exploitables, pas le brutal ni le vague." },
  { type: "register", q: "Un client vous remercie chaleureusement par téléphone.",
    ctx: "Subtilité de registre : ni tiède, ni excessif.",
    options: ["My pleasure — happy to help. If anything else comes up, you know where to find me.", "You are welcome beyond measure, dear Sir or Madam.", "No worries. Bye."],
    good: 0,
    tip: "« My pleasure — happy to help » est parfait : chaleureux, court, professionnel. Les deux autres sonnent mielleux ou expéditifs." },
  { type: "register", q: "Vous devez refuser poliment une demande croissante. Formulation la plus professionnelle :",
    ctx: "Refus ferme mais diplomate.",
    options: ["Unfortunately we're fully booked through the end of the quarter — I can, however, put you first in line for April.", "Absolutely not, we are not doing that.", "Well, I guess we could see, I don't know…"],
    good: 0,
    tip: "La première : refus net, empathique, avec une alternative concrète. C'est la marque d'un C1/C2 : savoir dire non sans fermer la porte." },

  { type: "synonym", q: "Manuel d'installation : « Ensure the panel is properly ______ before switching it on. »",
    ctx: "Trois verbes possibles, trois nuances différentes.",
    options: ["fastened", "stuck", "fixed"],
    good: 0,
    tip: "« Fastened » = fixé mécaniquement, visser/boulonner — registre technique standard. « Stuck » = collé (colle, plastique) ; « fixed » = réparé en usage courant (« I fixed the door »), ambigu pour la fixation mécanique." },
  { type: "synonym", q: "Rapport d'audit : « We found discrepancies ______ the delivered parts and the technical drawings. »",
    ctx: "Nuance de prépositions après « discrepancy »",
    options: ["between", "among", "within"],
    good: 0,
    tip: "« Between » pour exactement DEUX éléments comparés (pièces vs dessins). « Among » : à l'intérieur d'un groupe de plusieurs ; « within » : dans un seul objet." },
  { type: "synonym", q: "« L'annulation d'une clause » — la formulation juridique la plus juste :",
    ctx: "Vocabulaire des contrats, précision d'authenticité",
    options: ["to rescind a clause", "to renew a clause", "to render a clause"],
    good: 0,
    tip: "« To rescind » = annuler, faire comme si la clause n'avait été valide. « To revoke » s'applique à un document entier, « to cancel » à une commande. Nuance juridique réelle, comme en traduction." },
  { type: "synonym", q: "Email client : « Our engineers are ______ aware of the issue. »",
    ctx: "Collocations adverbe + adjectif",
    options: ["keenly", "loosely", "darkly"],
    good: 0,
    tip: "« Keenly aware » / « acutely aware » / « deeply aware » : toutes existent. « Loosely aware » et « darkly aware » ne sont pas des combinaisons idiomatiques." },
  { type: "synonym", q: "Vous voulez dire « le délai est ferme ». Formulation la plus idiomatique :",
    ctx: "Hedges et expressions figées C1/C2",
    options: ["The deadline is set in stone.", "The deadline is made of rocks.", "The deadline is in marble."],
    good: 0,
    tip: "« set in stone » est l'expression figée seule. À l'oral professionnel on entend aussi « carved in stone ». Ce sont des blocs mémorisés, jamais des reconstructions littérales." },

  { type: "colloc", q: "Vous prévenez un client d'un retard — fin de message :",
    ctx: "Collocations de politesse professionnelle",
    options: ["I do apologise for the inconvenience — we're doing everything we can to ship by Friday.", "Sorry about that!!! We'll fix it or whatever.", "Please accept my humblest and most profound apologies, madam."],
    good: 0,
    tip: "Professionnel, cordial, orienté solution : « inconvenience », « everything we can », une échéance concrète (Friday). Note américaine : « apologize » avec z ; la version avec s est britannique." },
  { type: "colloc", q: "« Could we ______ a call sometime next week to go through the numbers? »",
    ctx: "Collocations avec « call »",
    options: ["schedule", "do", "compose"],
    good: 0,
    tip: "« Schedule a call » : LA collocation standard. « Have a call » fonctionne aussi ; « do a call » est familier, « compose a call » n'existe pas." },
  { type: "colloc", q: "Vocabulaire des appels d'offres : « to ______ the requirements »",
    ctx: "Nuances de vérification contractuelle",
    options: ["meet", "reach", "arrive"],
    good: 0,
    tip: "« Meet the requirements » est la collocation standard. Alternative plus formelle : « comply with the requirements ». « Reach the requirements » n'existe pas." },
  { type: "colloc", q: "Vous voulez proposer un point d'étape. Formulation la plus naturelle :",
    ctx: "Collocations de suivi de projet",
    options: ["Let's touch base on Thursday.", "Let's make a base contact on Thursday.", "Let's pulsate a contact on Thursday."],
    good: 0,
    tip: "« Touch base » est l'idiome américain absolu pour « faire un point ». À C2, ces blocs deviennent vos réflexes — plus besoin d'improviser le mot juste." },
];

/* ---------- Tips pédagogiques (dashboard) ---------- */
const DAILY_TIPS = [
  "Conseil des pros de l'oral : votre oreille est déjà votre atout — c'est votre bouche qui prend du rythme. Cinq minutes de lecture à voix haute par jour suffisent à entretenir le muscle.",
  "L'anglais est une langue d'accent tonique : mot fort / mot faible. Enregistrez un paragraphe, réécoutez 24 h plus tard : les écarts qui semblaient mineurs deviennent évidents.",
  "Faux ami sonore n°1 : la terminaison -tion française. Precision, condition, education : en anglais l'accent tombe deux syllabes avant la fin.",
  "Quand vous doutez d'une formulation à l'oral, les natifs font exactement pareil : « Let me put it another way » vous gagne du temps et de la confiance.",
  "Le th anglais ne se prononce ni comme [t] ni comme [s] : la langue touche les dents. Deux minutes par jour suffisent à réintégrer le réflexe.",
  "En négociation orale, les nuanciers valent mieux que oui/non : « I can live with that », « That could work » placent des terrains médians avec élégance.",
  "À l'écrit vous éliminez les hedges ; à l'oral elles humanisent : « to be honest », « frankly speaking », « I'm not entirely sure, but… » marquent une prise de parole naturelle.",
  "Manie américaine utile : tout se dit en blocs. « Sense-check the numbers », « take it offline », « circle back ». Apprenez ces blocs par cœur — la fluidité suivra.",
];

/* ---------- Niveaux (prénoms de métier, pas de blagues) ---------- */
const LEVELS = [
  { xp: 0,    name: "Conversante" },
  { xp: 150,  name: "Assidue" },
  { xp: 400,  name: "Composite" },
  { xp: 800,  name: "Assermentée" },
  { xp: 1400, name: "Éloquente" },
  { xp: 2200, name: "Impeccable" },
  { xp: 3200, name: "Virtuose de l'oral" },
  { xp: 4400, name: "Maîtresse de l'oral" },
];
