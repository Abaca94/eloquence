/* ============================================================
   Éloquence — retour critique sur vos réponses en Tête-à-tête :
   sens (pertinence), formulation (calques, registre), grammaire
   (Harper, correcteur libre exécuté dans le navigateur) et
   prononciation (analyse son par son de js/phoneme.js).
   Tout reste sur l'appareil.
   ============================================================ */
const Critique = (function () {
  "use strict";
  const HARPER_BASE = window.ELOQUENCE_HARPER_BASE || "https://cdn.jsdelivr.net/npm/harper.js@3.2.0/dist/";
  let linter = null, linterP = null;
  function loadHarper() {
    if (linter) return Promise.resolve(linter);
    if (!linterP) linterP = (async () => {
      const [{ LocalLinter }, { slimBinary }] = await Promise.all([import(HARPER_BASE + "index.js"), import(HARPER_BASE + "slimBinary.js")]);
      const l = new LocalLinter({ binary: slimBinary });
      await l.setup();
      linter = l; return l;
    })().catch(e => { linterP = null; throw e; });
    return linterP;
  }
  /* Types ignorés à l'oral : la transcription n'a ni ponctuation ni majuscules fiables. */
  const SPOKEN_SKIP = new Set(["Capitalization", "Punctuation", "Formatting", "Spelling", "Typo", "BoundaryError"]);
  async function grammar(text, spoken) {
    const l = await loadHarper();
    const lints = await l.lint(text);
    return lints.map(x => ({ kind: x.lint_kind(), msg: x.message(), bad: x.get_problem_text(),
      fix: x.suggestions().map(s => s.get_replacement_text()).filter(Boolean).slice(0, 2) }))
      .filter(x => !(spoken && SPOKEN_SKIP.has(x.kind)))
      .filter(x => !/^i$/i.test(x.bad));
  }
  function traps(text) {
    const hits = [];
    FR_TRAPS.forEach(t => { const m = text.match(t.re); if (m) hits.push({ ...t, bad: m[0] }); });
    return hits;
  }
  function words(s) { return normalize(s).split(" ").filter(Boolean); }
  function closestHint(text, hints) {
    const u = new Set(words(text));
    let best = null, bs = -1;
    (hints || []).forEach(h => { const hw = words(h); const sc = hw.filter(w => u.has(w)).length / Math.max(1, hw.length); if (sc > bs) { bs = sc; best = h; } });
    return best;
  }

  /* Bilan de la conversation en cours. */
  let sum = null;
  function reset() { sum = { turns: 0, gram: 0, fr: 0, reg: 0, scores: [], words: {}, relevant: 0 }; }
  reset();

  /* Construit le retour pour une réplique. ctx = { text, spoken, audioP, node, match } */
  async function review(ctx, el) {
    const { text, spoken, node, match } = ctx;
    sum.turns++; if (match) sum.relevant++;
    const n = words(text).length;
    const parts = [];
    // Sens et pertinence.
    let sens = match ? "✅ <strong>Pertinent</strong> : votre réponse traite bien la question et fait avancer l'échange."
      : "❌ <strong>Hors cible</strong> : l'interlocuteur attendait une réponse sur un autre point. Pistes : " + (node.hints || []).map(h => "« " + esc(h) + " »").join(" · ");
    if (n < 5) sens += "<br>⚠️ Réponse très courte : à niveau C1, développez (une raison, une précision ou une question en retour).";
    parts.push(["Sens", sens]);
    // Formulation : calques et registre.
    const tr = traps(text), strong = tr.filter(t => !t.soft), soft = tr.filter(t => t.soft);
    strong.forEach(t => { if (t.kind === "reg") sum.reg++; else if (t.kind === "gram") sum.gram++; else sum.fr++; });
    let form = strong.length ? "<ul>" + strong.map(t => `<li><span class="bad">${esc(t.bad)}</span> → <strong>${esc(t.fix)}</strong><br><span class="muted">${esc(t.why)}</span></li>`).join("") + "</ul>" : "✅ Pas de calque du français repéré.";
    if (soft.length) form += "<div class=\"muted\">À considérer : " + soft.map(t => `<em>${esc(t.bad)}</em> (${esc(t.why)} → ${esc(t.fix)})`).join(" · ") + "</div>";
    const hint = closestHint(text, node.hints);
    if (hint) {
      const u = new Set(words(text));
      const shown = hint.split(/(\s+)/).map(w => /\S/.test(w) && !u.has(normalize(w)) ? "<b>" + esc(w) + "</b>" : esc(w)).join("");
      form += `<div class="native">Tournure native possible : « ${shown} » <button class="ghost small crit-say">🔊</button></div>`;
    }
    parts.push(["Formulation", form]);
    parts.push(["Grammaire", '<span class="muted">Vérification…</span>']);
    parts.push(["Prononciation", spoken ? (ctx.audioP ? '<span class="muted">Analyse son par son…</span>'
      : 'Pour un retour son par son, installez l\'analyse son par son (Prononciation › Répéter › Télécharger le modèle).')
      : '<span class="muted">Réponse écrite : pas d\'analyse de prononciation. Répondez à voix haute pour l\'obtenir.</span>']);
    el.innerHTML = `<details class="critique" open><summary>🧐 Retour détaillé</summary>${parts.map(([k, v]) => `<div class="crit-sec" data-k="${k}"><strong>${k}</strong><div>${v}</div></div>`).join("")}</details>`;
    const sec = (k) => el.querySelector(`.crit-sec[data-k="${k}"] > div`);
    const sb = el.querySelector(".crit-say"); if (sb) sb.onclick = () => Coach.say(hint.replace(/…/g, "."), false);
    // Grammaire (asynchrone).
    const seen = strong.map(t => t.bad.toLowerCase());
    grammar(text, spoken).then(g => {
      // Ce que la rubrique Formulation explique déjà n'est pas répété.
      g = g.filter(x => { const b = x.bad.toLowerCase(); return !seen.some(t => t.includes(b) || b.includes(t)); });
      sum.gram += g.length;
      sec("Grammaire").innerHTML = g.length ? "<ul>" + g.map(x => `<li><span class="tag">${esc(HARPER_KIND_FR[x.kind] || x.kind)}</span> <span class="bad">${esc(x.bad)}</span>${x.fix.length ? " → <strong>" + x.fix.map(esc).join(" / ") + "</strong>" : ""}<br><span class="muted">${esc(x.msg)}</span></li>`).join("") + "</ul>"
        : "✅ Aucune faute détectée." + (spoken ? ' <span class="muted">(Sur la transcription de la reconnaissance vocale.)</span>' : "");
    }).catch(e => { sec("Grammaire").innerHTML = '<span class="muted">Correcteur indisponible (' + esc(e.message || e) + "). Il se télécharge une fois (8 Mo) avec une connexion.</span>"; });
    // Prononciation (asynchrone).
    if (spoken && ctx.audioP) {
      try {
        const audio = await ctx.audioP;
        await Coach.loadLex();
        const ws = Coach.phonemeWords(text);
        if (!audio || !ws.length) { sec("Prononciation").innerHTML = '<span class="muted">Enregistrement inexploitable.</span>'; return; }
        const r = await Phoneme.run(audio, ws);
        logSoundIssues(r);
        sum.scores.push(r.score);
        const issues = [];
        r.words.forEach(w => w.sounds.filter(s => s.level !== "ok").forEach(s => issues.push({ w: w.word, s })));
        issues.forEach(i => { const k = i.w.toLowerCase(); sum.words[k] = (sum.words[k] || 0) + (i.s.level === "error" ? 2 : 1); });
        issues.sort((a, b) => (a.s.level === "error" ? 0 : 1) - (b.s.level === "error" ? 0 : 1));
        const bad = [...new Set(issues.map(i => i.w.toLowerCase()))];
        sec("Prononciation").innerHTML = `<strong>${r.score} / 100</strong> · ${r.score >= 90 ? "très clair" : r.score >= 75 ? "clair, quelques sons à soigner" : "plusieurs sons à reprendre"}
          ${issues.length ? "<ul>" + issues.slice(0, 4).map(i => `<li class="${i.s.level}"><strong>${esc(i.w)}</strong> · ${esc(i.s.label)}<br><span class="muted">${esc(i.s.tip)}</span></li>`).join("") + "</ul>" : ""}
          ${bad.length ? '<div>Travailler au coach : ' + bad.slice(0, 6).map(w => `<button class="chip-filter crit-coach" data-w="${esc(w)}">${esc(w)}</button>`).join("") + "</div>" : ""}
          <div class="muted">Comparé à ce que la reconnaissance a compris : un mot mal compris n'est pas noté.</div>`;
        sec("Prononciation").querySelectorAll(".crit-coach").forEach(b => b.onclick = () => openCoachWord(b.dataset.w));
      } catch (e) { sec("Prononciation").innerHTML = '<span class="muted">Analyse impossible (' + esc(e.message || e) + ").</span>"; }
    }
  }
  function summaryHTML() {
    if (!sum.turns) return "";
    const avg = sum.scores.length ? Math.round(sum.scores.reduce((a, b) => a + b, 0) / sum.scores.length) : null;
    const top = Object.entries(sum.words).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
    return `<div class="critique-sum"><strong>Bilan de la conversation</strong><ul>
      <li>Pertinence : ${sum.relevant} réponse(s) reconnue(s) sur ${sum.turns}</li>
      <li>Grammaire : ${sum.gram} point(s) signalé(s)</li>
      <li>Formulation : ${sum.fr} calque(s) du français, ${sum.reg} remarque(s) de registre</li>
      ${avg != null ? `<li>Prononciation : ${avg} / 100 en moyenne</li>` : ""}</ul>
      ${top.length ? "Mots à travailler : " + top.map(w => `<button class="chip-filter crit-coach" data-w="${esc(w)}">${esc(w)}</button>`).join("") : ""}</div>`;
  }
  return { review, reset, summaryHTML, loadHarper, traps, grammar };
})();
