const input = document.getElementById("userInput");
const btnWit = document.getElementById("btnWit");
const btnWisdom = document.getElementById("btnWisdom");
const btnHuman = document.getElementById("btnHuman");
const screenEl = document.querySelector(".screen");
const humanBubbleOverlay = document.getElementById("humanBubbleOverlay");
const storyNotesOverlay = document.getElementById("storyNotesOverlay");
const storyNotesScatter = document.getElementById("storyNotesScatter");
const storyNotesDone = document.getElementById("storyNotesDone");
const leaveMessageCompose = document.getElementById("leaveMessageCompose");
const leaveMessageInput = document.getElementById("leaveMessageInput");
const leaveMessagePost = document.getElementById("leaveMessagePost");
const leaveMessageComposeClose = document.getElementById("leaveMessageComposeClose");
const humanPostSuccess = document.getElementById("humanPostSuccess");
const statusEl = document.getElementById("status");
const printerSlot = document.getElementById("printerSlot");
const receiptStack = document.getElementById("receiptStack");
const receiptTpl = document.getElementById("receipt-template");
const screenMoodQuestion = document.getElementById("screenMoodQuestion");
const languageSelect = document.getElementById("languageSelect");
const screenHint = document.getElementById("screenHint");
const humanReadText = document.getElementById("humanReadText");
const humanWriteText = document.getElementById("humanWriteText");
const storyNotesBackLabel = document.getElementById("storyNotesBackLabel");
const leaveMessagePostLabel = document.getElementById("leaveMessagePostLabel");
const btnWitLabel = document.getElementById("btnWitLabel");
const btnWisdomLabel = document.getElementById("btnWisdomLabel");
const printerLabel = document.getElementById("printerLabel");
const placeholderYouSaid = document.getElementById("placeholderYouSaid");
const placeholderWaiting = document.getElementById("placeholderWaiting");
const placeholderResponse = document.getElementById("placeholderResponse");
const placeholderFooter = document.getElementById("placeholderFooter");
const voiceInputBtn = document.getElementById("voiceInputBtn");
const inputShell = document.querySelector(".input-shell");
const voiceLevelWave = document.getElementById("voiceLevelWave");

const MOOD_Q_STORAGE_KEY = "schrodinger-mood-q-index";
const UI_LANG_STORAGE_KEY = "schrodinger-ui-lang";
const UI_LANGS = new Set(["IT", "EN", "CN", "FR", "DE"]);
const DEFAULT_LANG = "EN";

const MAX_RECEIPTS = 40;
const RECEIPT_PRINT_SOUND_SRC = "/assets/Thermal_print.mp3";
/** Keep in sync with `.receipt--emerge` duration in styles.css */
const RECEIPT_FEED_MS = 1050;
const RECEIPT_FEED_EASING = "cubic-bezier(0.2, 0.85, 0.25, 1)";

let receiptPrintAudio;

function playReceiptPrintSound() {
  try {
    if (!receiptPrintAudio) {
      receiptPrintAudio = new Audio(RECEIPT_PRINT_SOUND_SRC);
      receiptPrintAudio.preload = "auto";
    }
    receiptPrintAudio.currentTime = 0;
    void receiptPrintAudio.play().catch(() => {});
  } catch {
    /* ignore missing file or autoplay blocks */
  }
}

/**
 * Older receipts jump when a new one is prepended; FLIP so they glide down with the feed.
 * `priorReceipts` / `topsBefore` are captured before prepend (same order).
 */
function animateReceiptStackFeedDown(priorReceipts, topsBefore) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || priorReceipts.length === 0) return;

  const topByEl = new Map(priorReceipts.map((el, i) => [el, topsBefore[i]]));
  const shifted = new Set();

  requestAnimationFrame(() => {
    priorReceipts.forEach((el) => {
      if (!el.isConnected || !topByEl.has(el)) return;
      const dy = topByEl.get(el) - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 0.75) return;
      shifted.add(el);
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
    });

    requestAnimationFrame(() => {
      shifted.forEach((el) => {
        if (!el.isConnected) return;
        el.style.transition = `transform ${RECEIPT_FEED_MS}ms ${RECEIPT_FEED_EASING}`;
        el.style.transform = "";
      });
    });
  });

  setTimeout(() => {
    priorReceipts.forEach((el) => {
      if (!el.isConnected) return;
      el.style.transition = "";
      el.style.transform = "";
    });
  }, RECEIPT_FEED_MS + 120);
}

const I18N = {
  EN: {
    moodQuestions: [
      "How has today been treating you?",
      "Did you learn something, or just realize something you already knew?",
      "Is there anything you didn't say, but wanted to?",
      "Was there a moment that didn't quite make sense?",
      "Did anything stick with you?",
    ],
    taglinePrefix: "Say something, then pick a path:",
    taglineMiddle: "for warmth with a clever lift, or",
    taglineSuffix: "for a sharper truth.",
    modeWit: "Wit",
    modeWisdom: "Wisdom",
    screenHint: "Press a button-the box only speaks after you choose.",
    inputPlaceholder: "I'm listening…",
    humanReadText: "Want to read someone else's story?",
    humanWriteText: "Want to leave a message for someone else?",
    storyBack: "Back",
    leaveMessagePlaceholder: "Write something for a stranger…",
    post: "POST",
    printerLabel: "▼ RECEIPT OUTPUT ▼",
    youSaid: "YOU SAID:",
    waitingLine: "(Waiting for your first line.)",
    responseDash: "RESPONSE [ — ]:",
    responsePrefix: "RESPONSE",
    moodLabel: "MOOD (INFERRED):",
    footer: "THANK YOU FOR USING SCHRODINGER'S BOX",
    demoMeta: "(Demo mode · no LLM connected)",
    dateLabel: "DATE",
    timeLabel: "TIME",
    statusTypeSomething: "Type something on the screen first.",
    statusThinking: "The box is collapsing your sentence…",
    statusWriteFirst: "Write something on the note first.",
    statusVoiceUnsupported: "Voice recognition is not supported in this browser.",
    statusVoiceStart: "Listening… speak now.",
    statusVoiceStopped: "Voice input stopped.",
    statusVoiceNoSpeech: "No speech was detected. Please try again.",
    statusVoiceCaptured: "Voice captured and inserted.",
    statusVoiceError: "Voice recognition failed. Please try again.",
    statusVoiceTranslateFail: "Speech captured, but translation failed. Original text inserted.",
    voiceInputTitle: "Voice input",
    writePostSuccess: "You've successfully left a message for other users. 😊",
    modeReceiptWit: "WIT",
    modeReceiptWisdom: "WISDOM",
    modeReceiptHuman: "HUMAN",
  },
  CN: {
    moodQuestions: [
      "今天过得怎么样？",
      "你今天是学到了什么，还是只是确认了你早就知道的事？",
      "有没有什么话你当时没说出口，但其实想说？",
      "有没有哪个瞬间让你觉得有点说不清？",
      "今天有什么一直留在你心里吗？",
    ],
    taglinePrefix: "说点什么，然后选一条路径：",
    taglineMiddle: "温暖而机敏的回应，或",
    taglineSuffix: "更锋利的真相。",
    modeWit: "机智",
    modeWisdom: "洞见",
    screenHint: "按下一个按钮-盒子会在你选择后回应。",
    inputPlaceholder: "我在听……",
    humanReadText: "想读读别人的故事吗？",
    humanWriteText: "想给别人留一句话吗？",
    storyBack: "返回",
    leaveMessagePlaceholder: "给一个陌生人写点什么……",
    post: "发布",
    printerLabel: "▼ 打印输出 ▼",
    youSaid: "你说：",
    waitingLine: "（等待你的第一句话。）",
    responseDash: "回应 [ — ]：",
    responsePrefix: "回应",
    moodLabel: "情绪（推断）：",
    footer: "感谢使用薛定谔之盒",
    demoMeta: "（演示模式 · 未连接 LLM）",
    dateLabel: "日期",
    timeLabel: "时间",
    statusTypeSomething: "先在屏幕上输入一些内容。",
    statusThinking: "盒子正在塌缩你的句子……",
    statusWriteFirst: "先在便签上写点内容。",
    statusVoiceUnsupported: "当前浏览器不支持语音识别。",
    statusVoiceStart: "正在聆听，请开始说话。",
    statusVoiceStopped: "语音输入已停止。",
    statusVoiceNoSpeech: "没有识别到语音，请再试一次。",
    statusVoiceCaptured: "语音已识别并填入输入框。",
    statusVoiceError: "语音识别失败，请重试。",
    statusVoiceTranslateFail: "语音已识别，但翻译失败，已填入原文。",
    voiceInputTitle: "语音输入",
    writePostSuccess: "你已成功给其他用户留下了一条消息。😊",
    modeReceiptWit: "机智",
    modeReceiptWisdom: "洞见",
    modeReceiptHuman: "人性",
  },
  DE: {
    moodQuestions: [
      "Wie hat dich der heutige Tag behandelt?",
      "Hast du heute etwas gelernt oder nur etwas erkannt, das du schon wusstest?",
      "Gab es etwas, das du nicht gesagt hast, aber sagen wolltest?",
      "Gab es einen Moment, der sich nicht ganz stimmig angefuhlt hat?",
      "Ist dir etwas besonders im Kopf geblieben?",
    ],
    taglinePrefix: "Sag etwas und wahl dann einen Weg:",
    taglineMiddle: "fur warme mit einem klugen Impuls, oder",
    taglineSuffix: "fur eine scharfere Wahrheit.",
    modeWit: "Witz",
    modeWisdom: "Weisheit",
    screenHint: "Drucke einen Knopf-die Box spricht erst nach deiner Wahl.",
    inputPlaceholder: "Ich hore zu…",
    humanReadText: "Mochtest du die Geschichte von jemand anderem lesen?",
    humanWriteText: "Mochtest du jemand anderem eine Nachricht hinterlassen?",
    storyBack: "Zuruck",
    leaveMessagePlaceholder: "Schreib etwas fur eine fremde Person…",
    post: "SENDEN",
    printerLabel: "▼ BONAUSGABE ▼",
    youSaid: "DU SAGTEST:",
    waitingLine: "(Warten auf deine erste Zeile.)",
    responseDash: "ANTWORT [ — ]:",
    responsePrefix: "ANTWORT",
    moodLabel: "STIMMUNG (ABGELEITET):",
    footer: "DANKE, DASS DU SCHRODINGERS BOX VERWENDEST",
    demoMeta: "(Demo-Modus · kein LLM verbunden)",
    dateLabel: "DATUM",
    timeLabel: "ZEIT",
    statusTypeSomething: "Schreibe zuerst etwas auf den Bildschirm.",
    statusThinking: "Die Box kollabiert gerade deinen Satz…",
    statusWriteFirst: "Schreibe zuerst etwas auf den Zettel.",
    statusVoiceUnsupported: "Spracherkennung wird in diesem Browser nicht unterstutzt.",
    statusVoiceStart: "Ich hore zu. Bitte jetzt sprechen.",
    statusVoiceStopped: "Spracheingabe wurde gestoppt.",
    statusVoiceNoSpeech: "Keine Sprache erkannt. Bitte versuche es erneut.",
    statusVoiceCaptured: "Sprache erfasst und in das Feld eingesetzt.",
    statusVoiceError: "Spracherkennung fehlgeschlagen. Bitte erneut versuchen.",
    statusVoiceTranslateFail:
      "Sprache erkannt, aber Ubersetzung fehlgeschlagen. Originaltext wurde eingesetzt.",
    voiceInputTitle: "Spracheingabe",
    writePostSuccess: "Du hast erfolgreich eine Nachricht fur andere Nutzer hinterlassen. 😊",
    modeReceiptWit: "WITZ",
    modeReceiptWisdom: "WEISHEIT",
    modeReceiptHuman: "MENSCH",
  },
  FR: {
    moodQuestions: [
      "Comment cette journee t'a-t-elle traite ?",
      "As-tu appris quelque chose aujourd'hui, ou juste realise ce que tu savais deja ?",
      "Y a-t-il quelque chose que tu n'as pas dit, mais que tu voulais dire ?",
      "Y a-t-il eu un moment qui ne semblait pas tout a fait clair ?",
      "Est-ce que quelque chose est reste avec toi ?",
    ],
    taglinePrefix: "Dis quelque chose, puis choisis une voie :",
    taglineMiddle: "pour une chaleur avec une touche maligne, ou",
    taglineSuffix: "pour une verite plus tranchante.",
    modeWit: "Esprit",
    modeWisdom: "Sagesse",
    screenHint: "Appuie sur un bouton-la boite ne parle qu'apres ton choix.",
    inputPlaceholder: "Je t'ecoute…",
    humanReadText: "Tu veux lire l'histoire de quelqu'un d'autre ?",
    humanWriteText: "Tu veux laisser un message a quelqu'un d'autre ?",
    storyBack: "Retour",
    leaveMessagePlaceholder: "Ecris quelque chose pour un inconnu…",
    post: "PUBLIER",
    printerLabel: "▼ SORTIE TICKET ▼",
    youSaid: "TU AS DIT :",
    waitingLine: "(En attente de ta premiere ligne.)",
    responseDash: "REPONSE [ — ] :",
    responsePrefix: "REPONSE",
    moodLabel: "HUMEUR (INFERREE) :",
    footer: "MERCI D'UTILISER LA BOITE DE SCHRODINGER",
    demoMeta: "(Mode demo · aucun LLM connecte)",
    dateLabel: "DATE",
    timeLabel: "HEURE",
    statusTypeSomething: "Ecris d'abord quelque chose sur l'ecran.",
    statusThinking: "La boite est en train de faire s'effondrer ta phrase…",
    statusWriteFirst: "Ecris d'abord quelque chose sur la note.",
    statusVoiceUnsupported: "La reconnaissance vocale n'est pas prise en charge par ce navigateur.",
    statusVoiceStart: "Ecoute en cours... parle maintenant.",
    statusVoiceStopped: "Saisie vocale arretee.",
    statusVoiceNoSpeech: "Aucune voix detectee. Reessaie.",
    statusVoiceCaptured: "Voix captee et inseree dans le champ.",
    statusVoiceError: "La reconnaissance vocale a echoue. Reessaie.",
    statusVoiceTranslateFail:
      "Voix captee, mais traduction echouee. Le texte original a ete insere.",
    voiceInputTitle: "Saisie vocale",
    writePostSuccess: "Tu as laisse avec succes un message pour les autres utilisateurs. 😊",
    modeReceiptWit: "ESPRIT",
    modeReceiptWisdom: "SAGESSE",
    modeReceiptHuman: "HUMAIN",
  },
  IT: {
    moodQuestions: [
      "Come ti ha trattato oggi?",
      "Hai imparato qualcosa oggi, o hai solo capito qualcosa che sapevi gia?",
      "C'e qualcosa che non hai detto, ma volevi dire?",
      "C'e stato un momento che non aveva del tutto senso?",
      "C'e qualcosa che ti e rimasto addosso?",
    ],
    taglinePrefix: "Di qualcosa, poi scegli un percorso:",
    taglineMiddle: "per calore con un tocco brillante, oppure",
    taglineSuffix: "per una verita piu tagliente.",
    modeWit: "Arguzia",
    modeWisdom: "Saggezza",
    screenHint: "Premi un pulsante-la scatola parla solo dopo la tua scelta.",
    inputPlaceholder: "Ti ascolto…",
    humanReadText: "Vuoi leggere la storia di qualcun altro?",
    humanWriteText: "Vuoi lasciare un messaggio a qualcun altro?",
    storyBack: "Indietro",
    leaveMessagePlaceholder: "Scrivi qualcosa per uno sconosciuto…",
    post: "PUBBLICA",
    printerLabel: "▼ USCITA SCONTRINO ▼",
    youSaid: "HAI DETTO:",
    waitingLine: "(In attesa della tua prima riga.)",
    responseDash: "RISPOSTA [ — ]:",
    responsePrefix: "RISPOSTA",
    moodLabel: "UMORE (DEDOTTO):",
    footer: "GRAZIE PER AVER USATO LA SCATOLA DI SCHRODINGER",
    demoMeta: "(Modalita demo · nessun LLM collegato)",
    dateLabel: "DATA",
    timeLabel: "ORA",
    statusTypeSomething: "Scrivi prima qualcosa sullo schermo.",
    statusThinking: "La scatola sta collassando la tua frase…",
    statusWriteFirst: "Scrivi prima qualcosa sul foglietto.",
    statusVoiceUnsupported: "Il riconoscimento vocale non e supportato in questo browser.",
    statusVoiceStart: "In ascolto... parla ora.",
    statusVoiceStopped: "Inserimento vocale interrotto.",
    statusVoiceNoSpeech: "Nessuna voce rilevata. Riprova.",
    statusVoiceCaptured: "Voce acquisita e inserita nel campo.",
    statusVoiceError: "Riconoscimento vocale fallito. Riprova.",
    statusVoiceTranslateFail:
      "Voce acquisita, ma traduzione non riuscita. Inserito il testo originale.",
    voiceInputTitle: "Inserimento vocale",
    writePostSuccess: "Hai lasciato con successo un messaggio per altri utenti. 😊",
    modeReceiptWit: "ARGUZIA",
    modeReceiptWisdom: "SAGGEZZA",
    modeReceiptHuman: "UMANO",
  },
};

let currentLang = DEFAULT_LANG;
let speechRecognition = null;
let speechListening = false;

function waitMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function t(key) {
  return I18N[currentLang]?.[key] ?? I18N[DEFAULT_LANG][key] ?? "";
}

function moodQuestions() {
  return I18N[currentLang]?.moodQuestions ?? I18N[DEFAULT_LANG].moodQuestions;
}

function speechLocaleForLang(lang) {
  if (lang === "CN") return "zh-CN";
  if (lang === "DE") return "de-DE";
  if (lang === "FR") return "fr-FR";
  if (lang === "IT") return "it-IT";
  return "en-US";
}

function setVoiceUiActive(active) {
  if (voiceInputBtn) {
    voiceInputBtn.classList.toggle("voice-input-btn--listening", active);
  }
  if (inputShell) {
    inputShell.classList.toggle("input-shell--voice-active", active);
  }
  input.disabled = active;
}

function setVoiceWaveLevel(level) {
  if (!voiceLevelWave) return;
  const safe = Math.max(0, Math.min(1, Number(level) || 0));
  voiceLevelWave.style.setProperty("--voice-level", safe.toFixed(3));
}

function getMoodQuestionIndex() {
  const questions = moodQuestions();
  const raw = localStorage.getItem(MOOD_Q_STORAGE_KEY);
  const n = raw == null ? 0 : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n % questions.length;
}

function setMoodQuestionIndex(i) {
  const len = moodQuestions().length;
  const normalized = ((i % len) + len) % len;
  localStorage.setItem(MOOD_Q_STORAGE_KEY, String(normalized));
}

function renderMoodQuestion() {
  if (!screenMoodQuestion) return;
  screenMoodQuestion.textContent = moodQuestions()[getMoodQuestionIndex()];
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    el.setAttribute("placeholder", t(key));
  });
  if (screenHint) screenHint.textContent = t("screenHint");
  if (humanReadText) humanReadText.textContent = t("humanReadText");
  if (humanWriteText) humanWriteText.textContent = t("humanWriteText");
  if (storyNotesBackLabel) storyNotesBackLabel.textContent = t("storyBack");
  if (leaveMessagePostLabel) leaveMessagePostLabel.textContent = t("post");
  if (btnWitLabel) btnWitLabel.textContent = t("modeWit");
  if (btnWisdomLabel) btnWisdomLabel.textContent = t("modeWisdom");
  if (printerLabel) printerLabel.textContent = t("printerLabel");
  if (placeholderYouSaid) placeholderYouSaid.textContent = t("youSaid");
  if (placeholderWaiting) placeholderWaiting.textContent = t("waitingLine");
  if (placeholderResponse) placeholderResponse.textContent = t("responseDash");
  if (placeholderFooter) placeholderFooter.textContent = t("footer");
  if (voiceInputBtn) {
    voiceInputBtn.setAttribute("aria-label", t("voiceInputTitle"));
    voiceInputBtn.setAttribute("title", t("voiceInputTitle"));
  }
}

function initLanguagePicker() {
  const saved = localStorage.getItem(UI_LANG_STORAGE_KEY);
  const initial = UI_LANGS.has(saved) ? saved : DEFAULT_LANG;
  currentLang = initial;
  document.documentElement.lang = currentLang.toLowerCase();
  applyStaticTranslations();
  renderMoodQuestion();
  if (!languageSelect) return;
  languageSelect.value = currentLang;
  languageSelect.addEventListener("change", () => {
    const selected = UI_LANGS.has(languageSelect.value) ? languageSelect.value : DEFAULT_LANG;
    languageSelect.value = selected;
    currentLang = selected;
    localStorage.setItem(UI_LANG_STORAGE_KEY, selected);
    document.documentElement.lang = selected.toLowerCase();
    applyStaticTranslations();
    renderMoodQuestion();
  });
}

function advanceMoodQuestionAfterAnswer() {
  setMoodQuestionIndex(getMoodQuestionIndex() + 1);
  if (!screenMoodQuestion) return;
  screenMoodQuestion.classList.add("is-fading");
  setTimeout(() => {
    renderMoodQuestion();
    screenMoodQuestion.classList.remove("is-fading");
  }, 450);
}

/** Fade in centered POST success copy (needs two frames so opacity transition runs). */
function revealHumanPostSuccessLine() {
  if (!humanPostSuccess) return;
  humanPostSuccess.classList.remove("human-post-success--visible");
  void humanPostSuccess.offsetWidth;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      humanPostSuccess.classList.add("human-post-success--visible");
    });
  });
}

/** Anonymous English scraps for the "read someone else's story" desk. */
const STORY_NOTE_POOL = [
  "Some nights I rehearse conversations that already ended. I'm trying to forgive myself for caring too loudly.",
  "My anxiety isn't dramatic—it's exhausting. If you're the same: you're not weak, you're human at full volume.",
  "I moved cities for a fresh start and still packed the old ache in my suitcase. Healing isn't geography; it's practice.",
  "To whoever needed this: water, something small to eat, and a five-minute walk still count as bravery today.",
  "I'm scared my friends only tolerate me. Someone said overthinking is empathy without direction—I'm learning to aim it gently.",
  "Grief doesn't ask for productivity. Some weeks the win is staying kind while you're broken.",
  "If you're waiting for permission to rest: granted. The world keeps spinning; you can sit down.",
  "I compare my behind-the-scenes to everyone's highlight reel. Logging off that habit is a daily job.",
  "You don't owe anyone a polished version of your pain. Messy honesty is how people find each other.",
  "I feel late to everything—career, love, healing. Maybe we're not late; we're on a stranger timeline.",
  "One thing that helped: a voice memo to myself, no judgment, just naming what hurts. It shrank the noise.",
  "Whoever reads this: your feelings aren't too much. The container was just too small.",
  "I keep saying 'I'm fine' until my body argues back. Listening earlier would have cost less.",
  "You are allowed to outgrow the version of you that survived—not the one who deserved more.",
];

const STORY_NOTE_SLOTS = [
  { l: 5, t: 11, r: -5 },
  { l: 48, t: 7, r: 4 },
  { l: 22, t: 36, r: -3 },
  { l: 60, t: 26, r: 5 },
  { l: 8, t: 54, r: 3 },
  { l: 52, t: 52, r: -4 },
  { l: 32, t: 18, r: 2 },
  { l: 68, t: 46, r: -4 },
];

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Raised on each note click so the active sheet floats above the rest. */
let storyNotesStackPeak = 40;

function dismissStoryNote(note) {
  if (!note || note.classList.contains("story-note--leaving")) return;
  note.classList.add("story-note--leaving");
  const onEnd = (e) => {
    if (e.propertyName !== "opacity") return;
    note.removeEventListener("transitionend", onEnd);
    note.remove();
    if (storyNotesScatter && storyNotesScatter.children.length === 0) {
      closeStoryNotesOverlay();
    }
  };
  note.addEventListener("transitionend", onEnd);
}

function openStoryNotesOverlay() {
  if (!storyNotesOverlay || !storyNotesScatter) return;

  const texts = shuffleInPlace([...STORY_NOTE_POOL]).slice(0, 7);
  const slots = shuffleInPlace([...STORY_NOTE_SLOTS]).slice(0, texts.length);

  storyNotesScatter.replaceChildren();
  storyNotesStackPeak = 40;

  texts.forEach((body, i) => {
    const slot = slots[i] ?? STORY_NOTE_SLOTS[i];
    const jitterL = (Math.random() - 0.5) * 5;
    const jitterT = (Math.random() - 0.5) * 6;
    const jitterR = (Math.random() - 0.5) * 3;

    const note = document.createElement("article");
    note.className = "story-note";
    note.tabIndex = 0;
    note.style.zIndex = String(10 + i);
    note.style.setProperty("--sn-left", `${Math.max(2, slot.l + jitterL)}%`);
    note.style.setProperty("--sn-top", `${Math.max(4, slot.t + jitterT)}%`);
    note.style.setProperty("--sn-rot", `${slot.r + jitterR}deg`);

    const p = document.createElement("p");
    p.className = "story-note__body";
    p.textContent = body;

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "story-note__dismiss";
    dismiss.setAttribute("aria-label", "Dismiss note");
    const xSpan = document.createElement("span");
    xSpan.className = "story-note__dismiss-x";
    xSpan.setAttribute("aria-hidden", "true");
    xSpan.textContent = "×";
    dismiss.appendChild(xSpan);

    note.appendChild(p);
    note.appendChild(dismiss);
    storyNotesScatter.appendChild(note);
  });

  storyNotesOverlay.classList.add("story-notes-overlay--visible");
  storyNotesOverlay.setAttribute("aria-hidden", "false");
}

function closeStoryNotesOverlay() {
  if (!storyNotesOverlay) return;
  storyNotesOverlay.classList.remove("story-notes-overlay--visible");
  storyNotesOverlay.setAttribute("aria-hidden", "true");
}

function openLeaveMessageCompose() {
  if (!leaveMessageCompose || !leaveMessageInput) return;
  leaveMessageCompose.classList.remove("leave-message-compose--leaving");
  leaveMessageInput.value = "";
  leaveMessageCompose.classList.add("leave-message-compose--visible");
  leaveMessageCompose.setAttribute("aria-hidden", "false");
  setStatus("");
  requestAnimationFrame(() => leaveMessageInput.focus());
}

function finishLeaveComposeUi() {
  if (!leaveMessageCompose) return;
  leaveMessageCompose.classList.remove(
    "leave-message-compose--visible",
    "leave-message-compose--leaving",
  );
  leaveMessageCompose.setAttribute("aria-hidden", "true");
  if (leaveMessageInput) leaveMessageInput.value = "";
  if (leaveMessagePost) leaveMessagePost.disabled = false;
}

function afterComposeOpacityTransition(el, cb) {
  const done = () => {
    el.removeEventListener("transitionend", onTransitionEnd);
    clearTimeout(fallback);
    cb();
  };
  const onTransitionEnd = (e) => {
    if (e.target !== el || e.propertyName !== "opacity") return;
    done();
  };
  const fallback = setTimeout(done, 750);
  el.addEventListener("transitionend", onTransitionEnd);
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function stampNow() {
  const d = new Date();
  const date = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { date, time, line: `${t("dateLabel")}: ${date}   ${t("timeLabel")}: ${time}` };
}

function modeLabel(mode) {
  if (mode === "wit") return t("modeReceiptWit");
  if (mode === "wisdom") return t("modeReceiptWisdom");
  return t("modeReceiptHuman");
}

function removePlaceholder() {
  document.getElementById("receiptPlaceholder")?.remove();
}

function trimReceiptStack() {
  while (receiptStack.children.length > MAX_RECEIPTS) {
    receiptStack.removeChild(receiptStack.lastElementChild);
  }
}

function buildReceipt({ userText, mode, reply, mood, usedMock }) {
  const node = receiptTpl.content.firstElementChild.cloneNode(true);
  const $ = (part) => node.querySelector(`[data-part="${part}"]`);

  $("youLabel").textContent = t("youSaid");
  $("you").textContent = userText;
  $("modeLine").textContent = `${t("responsePrefix")} [ ${modeLabel(mode)} ]:`;
  $("reply").textContent = reply;
  $("time").textContent = stampNow().line;
  $("meta").textContent = usedMock ? t("demoMeta") : "";
  $("footer").textContent = t("footer");

  const moodLabelEl = $("moodLabel");
  const moodEl = $("mood");
  if (mood) {
    moodLabelEl.hidden = false;
    moodEl.hidden = false;
    moodLabelEl.textContent = t("moodLabel");
    moodEl.textContent = mood;
  }

  return node;
}

function scrollToFreshPaper() {
  printerSlot.scrollTo({ top: 0, behavior: "smooth" });
}

function openHumanBubbleOverlay() {
  if (!screenEl || !humanBubbleOverlay) return;
  humanBubbleOverlay.classList.remove("human-bubble-overlay--closing");
  screenEl.classList.add("screen--human-bubbles");
  humanBubbleOverlay.classList.add("human-bubble-overlay--visible");
  humanBubbleOverlay.setAttribute("aria-hidden", "false");
  btnWit.disabled = true;
  btnWisdom.disabled = true;
  btnHuman.disabled = true;
}

function closeHumanBubbleOverlay() {
  if (!screenEl || !humanBubbleOverlay) return;
  screenEl.classList.remove("screen--human-bubbles");
  humanBubbleOverlay.classList.remove(
    "human-bubble-overlay--visible",
    "human-bubble-overlay--closing",
  );
  humanBubbleOverlay.setAttribute("aria-hidden", "true");
  btnWit.disabled = false;
  btnWisdom.disabled = false;
  btnHuman.disabled = false;
}

function closeHumanBubbleOverlayAnimated() {
  if (!screenEl || !humanBubbleOverlay) return;
  if (!humanBubbleOverlay.classList.contains("human-bubble-overlay--visible")) {
    return;
  }

  screenEl.classList.remove("screen--human-bubbles");
  humanBubbleOverlay.setAttribute("aria-hidden", "true");
  humanBubbleOverlay.classList.add("human-bubble-overlay--closing");

  const finish = () => {
    humanBubbleOverlay.classList.remove(
      "human-bubble-overlay--visible",
      "human-bubble-overlay--closing",
    );
    btnWit.disabled = false;
    btnWisdom.disabled = false;
    btnHuman.disabled = false;
    input.focus();
  };

  const fallback = setTimeout(finish, 800);
  humanBubbleOverlay.addEventListener(
    "transitionend",
    (e) => {
      if (e.target !== humanBubbleOverlay || e.propertyName !== "opacity") {
        return;
      }
      clearTimeout(fallback);
      finish();
    },
    { once: true },
  );
}

async function translateSpeechToCurrentLang(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return "";
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLang: currentLang }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Translation failed");
  return typeof data.text === "string" && data.text.trim() ? data.text.trim() : text;
}

function initVoiceInput() {
  if (!voiceInputBtn) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceInputBtn.disabled = true;
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.maxAlternatives = 1;
  let finalTranscript = "";

  speechRecognition.addEventListener("start", () => {
    speechListening = true;
    setVoiceUiActive(true);
    finalTranscript = "";
    setVoiceWaveLevel(0.18);
    setStatus(t("statusVoiceStart"));
  });

  speechRecognition.addEventListener("result", async (event) => {
    if (!event.results) return;
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const part = event.results[i]?.[0]?.transcript || "";
      if (event.results[i].isFinal) {
        finalTranscript += part;
      } else {
        interim += part;
      }
    }
    const merged = `${finalTranscript} ${interim}`.trim();
    if (merged) input.value = merged;
    setVoiceWaveLevel(interim ? 0.88 : 0.44);
  });

  speechRecognition.addEventListener("speechstart", () => {
    setVoiceWaveLevel(1);
  });

  speechRecognition.addEventListener("speechend", async () => {
    setVoiceWaveLevel(0.3);
    const transcript = input.value.trim();
    if (!transcript) {
      setStatus(t("statusVoiceNoSpeech"), true);
      return;
    }
    try {
      const translated = await translateSpeechToCurrentLang(transcript);
      input.value = translated;
      input.focus();
      setStatus(t("statusVoiceCaptured"));
    } catch {
      input.value = transcript;
      input.focus();
      setStatus(t("statusVoiceTranslateFail"), true);
    }
  });

  speechRecognition.addEventListener("error", (event) => {
    if (event?.error === "no-speech") {
      setStatus(t("statusVoiceNoSpeech"), true);
      return;
    }
    setStatus(t("statusVoiceError"), true);
  });

  speechRecognition.addEventListener("end", () => {
    speechListening = false;
    setVoiceUiActive(false);
    setVoiceWaveLevel(0);
  });

  voiceInputBtn.addEventListener("click", () => {
    if (!speechRecognition) return;
    if (speechListening) {
      speechRecognition.stop();
      setStatus(t("statusVoiceStopped"));
      return;
    }
    try {
      speechRecognition.lang = speechLocaleForLang(currentLang);
      speechRecognition.start();
    } catch {
      setStatus(t("statusVoiceError"), true);
    }
  });
}

async function submit(mode, options = {}) {
  const { humanChoice, textOverride, successStatus, suppressFooterStatus } = options;

  let text = textOverride != null ? String(textOverride).trim() : input.value.trim();
  if (!text && mode === "human" && humanChoice && textOverride == null) {
    text =
      humanChoice === "read"
        ? "I want to read someone else's story."
        : "I want to leave a message for someone else.";
  }

  if (!text) {
    setStatus(t("statusTypeSomething"), true);
    input.focus();
    return false;
  }

  btnWit.disabled = true;
  btnWisdom.disabled = true;
  btnHuman.disabled = true;
  setStatus(t("statusThinking"));

  try {
    const normalizedMode =
      mode === "wit" || mode === "wisdom" || mode === "human" ? mode : String(mode || "");
    const body = { text, mode: normalizedMode, lang: currentLang };
    if (normalizedMode === "human" && humanChoice) {
      body.humanChoice = humanChoice;
    }

    const res = await fetch("/api/box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    removePlaceholder();

    const priorReceipts = [...receiptStack.querySelectorAll(".receipt")];
    const topsBefore = priorReceipts.map((el) => el.getBoundingClientRect().top);

    const article = buildReceipt({
      userText: data.userLine || text,
      mode,
      reply: data.reply,
      mood: data.mood || "",
      usedMock: !!data.usedMock,
    });

    article.classList.add("receipt--emerge");
    receiptStack.prepend(article);
    trimReceiptStack();
    playReceiptPrintSound();
    animateReceiptStackFeedDown(priorReceipts, topsBefore);

    requestAnimationFrame(() => {
      scrollToFreshPaper();
    });

    article.addEventListener(
      "animationend",
      () => article.classList.remove("receipt--emerge"),
      { once: true },
    );

    setStatus(
      suppressFooterStatus
        ? ""
        : successStatus !== undefined
          ? successStatus
          : "",
    );
    if (normalizedMode === "wit" || normalizedMode === "wisdom") {
      advanceMoodQuestionAfterAnswer();
    }
    return true;
  } catch (e) {
    setStatus(e.message || "Something went wrong", true);
    return false;
  } finally {
    btnWit.disabled = false;
    btnWisdom.disabled = false;
    btnHuman.disabled = false;
    if (humanBubbleOverlay?.classList.contains("human-bubble-overlay--visible")) {
      btnWit.disabled = true;
      btnWisdom.disabled = true;
      btnHuman.disabled = true;
    }
  }
}

btnWit.addEventListener("click", () => submit("wit"));
btnWisdom.addEventListener("click", () => submit("wisdom"));
btnHuman.addEventListener("click", () => openHumanBubbleOverlay());

document.getElementById("humanBubbleClose")?.addEventListener("click", () => {
  closeHumanBubbleOverlayAnimated();
});

document.querySelector('[data-human-choice="read"]')?.addEventListener("click", () => {
  openStoryNotesOverlay();
});

document.querySelector('[data-human-choice="write"]')?.addEventListener("click", () => {
  openLeaveMessageCompose();
});

leaveMessageComposeClose?.addEventListener("click", () => {
  if (!leaveMessageCompose?.classList.contains("leave-message-compose--visible")) return;
  if (leaveMessageCompose.classList.contains("leave-message-compose--leaving")) return;
  leaveMessageCompose.classList.add("leave-message-compose--leaving");
  afterComposeOpacityTransition(leaveMessageCompose, () => {
    finishLeaveComposeUi();
  });
});

leaveMessagePost?.addEventListener("click", () => {
  const msg = leaveMessageInput?.value?.trim() ?? "";
  if (!msg) {
    setStatus(t("statusWriteFirst"), true);
    leaveMessageInput?.focus();
    return;
  }
  if (leaveMessageCompose?.classList.contains("leave-message-compose--leaving")) return;
  leaveMessagePost.disabled = true;
  leaveMessageCompose.classList.add("leave-message-compose--leaving");

  const submitPromise = submit("human", {
    humanChoice: "write",
    textOverride: msg,
    suppressFooterStatus: true,
  });

  afterComposeOpacityTransition(leaveMessageCompose, async () => {
    finishLeaveComposeUi();
    if (!humanBubbleOverlay || !humanPostSuccess) {
      leaveMessagePost.disabled = false;
      await submitPromise;
      return;
    }

    humanBubbleOverlay.classList.add("human-bubble-overlay--post-success");
    const ok = await submitPromise;

    if (!ok) {
      humanBubbleOverlay.classList.remove("human-bubble-overlay--post-success");
      leaveMessagePost.disabled = false;
      return;
    }

    humanPostSuccess.textContent = t("writePostSuccess");
    humanPostSuccess.setAttribute("aria-hidden", "false");
    revealHumanPostSuccessLine();

    await waitMs(2200);

    humanPostSuccess.classList.remove("human-post-success--visible");

    let cleaned = false;
    const cleanupSuccessLine = () => {
      if (cleaned) return;
      cleaned = true;
      humanPostSuccess.textContent = "";
      humanPostSuccess.setAttribute("aria-hidden", "true");
      humanBubbleOverlay.classList.remove("human-bubble-overlay--post-success");
      leaveMessagePost.disabled = false;
    };

    const onEnd = (e) => {
      if (e.target !== humanPostSuccess || e.propertyName !== "opacity") return;
      humanPostSuccess.removeEventListener("transitionend", onEnd);
      cleanupSuccessLine();
    };
    humanPostSuccess.addEventListener("transitionend", onEnd);
    setTimeout(() => {
      humanPostSuccess.removeEventListener("transitionend", onEnd);
      cleanupSuccessLine();
    }, 900);
  });
});

storyNotesScatter?.addEventListener("click", (e) => {
  const note = e.target.closest(".story-note");
  if (!note || !storyNotesScatter.contains(note)) return;
  if (note.classList.contains("story-note--leaving")) return;

  if (e.target.closest(".story-note__dismiss")) {
    e.stopPropagation();
    dismissStoryNote(note);
    return;
  }

  storyNotesStackPeak += 1;
  note.style.zIndex = String(storyNotesStackPeak);
});

storyNotesDone?.addEventListener("click", () => {
  closeStoryNotesOverlay();
});

/** Background video: play forward to end, then scrub backward to start, repeat (ping‑pong loop). */
function setupScreenVideoPingPong() {
  const video = document.querySelector(".screen__video");
  if (!video) return;

  let reversing = false;
  let rafId = 0;
  let lastTs = 0;

  function stopReverse() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    reversing = false;
  }

  function reverseFrame(ts) {
    if (!reversing) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.12, (ts - lastTs) / 1000);
    lastTs = ts;

    let t = video.currentTime - dt;
    if (t <= 0.001) {
      video.currentTime = 0;
      stopReverse();
      video.play().catch(() => {});
      return;
    }
    video.currentTime = t;
    rafId = requestAnimationFrame(reverseFrame);
  }

  video.addEventListener("ended", () => {
    if (reversing) return;
    video.pause();
    reversing = true;
    lastTs = 0;
    const d = video.duration;
    if (Number.isFinite(d) && d > 0) {
      video.currentTime = d;
    }
    rafId = requestAnimationFrame(reverseFrame);
  });

  video.addEventListener("play", stopReverse);

  video.play().catch(() => {});
}

initLanguagePicker();
initVoiceInput();
setupScreenVideoPingPong();
