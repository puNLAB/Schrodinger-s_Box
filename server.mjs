import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3847;

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
/**
 * `gemini-1.5-flash` often 404s on v1beta (retired alias). Override in .env.
 * If 429: try `gemini-2.5-flash-lite` or wait / enable billing.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function llmConfigured() {
  return !!(
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

const SUPPORTED_LANGS = new Set(["EN", "CN", "DE", "FR", "IT"]);

const LANGUAGE_NAME = {
  EN: "English",
  CN: "Simplified Chinese",
  DE: "German",
  FR: "French",
  IT: "Italian",
};

function normalizeLang(rawLang) {
  const candidate =
    typeof rawLang === "string" ? rawLang.trim().toUpperCase() : "EN";
  return SUPPORTED_LANGS.has(candidate) ? candidate : "EN";
}

function buildReceiptSystemPrompt(lang) {
  const languageName = LANGUAGE_NAME[lang] || LANGUAGE_NAME.EN;
  return `You are the voice inside "Schrodinger's Box": a speaking machine the user confides in, then presses "Wit", "Wisdom", or "Human".

Write ALL user-facing text in ${languageName}. Rules you must follow:
1) Infer their dominant emotional tone in one or two short phrases (no medical diagnosis, literary summary only).
2) Write "reply" according to the selected mode:
   - Wit: warmer than plain snark. Light, clever, surprising, kind underneath.
   - Wisdom: sharper and more cutting than generic advice. Direct clarity, minimal cushioning.
   - Human: warm, grounded, plainspoken, humane and concrete.
3) "userLine" = natural paraphrase of the user's message in ${languageName} (one to three short sentences).
4) Keep each field concise enough to print on a receipt.
5) Output only one JSON object, no markdown, with exact keys:
{"mood":"...","reply":"...","userLine":"..."}`;
}

function buildTranslateSystemPrompt(targetLang) {
  const languageName = LANGUAGE_NAME[targetLang] || LANGUAGE_NAME.EN;
  return `Detect the source language and translate text for UI input.

Rules:
1) If source language is already ${languageName}, keep wording unchanged except very light cleanup.
2) If source language is different, translate into natural ${languageName}.
3) Keep original meaning and tone.
4) Output ONLY one JSON object with exact keys:
{"text":"...","detectedLang":"...","translated":true}`;
}

function buildReceiptUserMessage(userText, mode, humanChoice) {
  const modeName =
    mode === "wit" ? "Wit" : mode === "wisdom" ? "Wisdom" : "Human";
  let pathNote = "";
  if (mode === "human" && humanChoice === "read") {
    pathNote =
      "\nHuman path: The user wants to read someone else's story (browse others' experiences).";
  } else if (mode === "human" && humanChoice === "write") {
    pathNote =
      "\nHuman path: The user wants to leave a message for someone else.";
  }
  return `User said:\n${userText}\n\nMode chosen: ${modeName}${pathNote}`;
}

function temperatureForMode(mode) {
  return mode === "wit" ? 0.88 : mode === "wisdom" ? 0.68 : 0.72;
}

const MOCK_BY_LANG = {
  EN: {
    wit: "You are allowed to be this tired and still worthy. The day was loud, but you still stayed with yourself.",
    wisdom:
      "Stop narrating your life as if you are already defeated. Name one fact you are avoiding, then do ten focused minutes.",
    humanDefault:
      "What you said matters. In the next hour, do one small act that puts you on your own side.",
    humanRead:
      "Somewhere, someone is carrying a chapter that rhymes with yours. Read gently and let yourself feel less alone.",
    humanWrite:
      "Your sentence can be the hinge in someone else's day. Write one true line and let it travel.",
    moodWit: "Anxious, a little stuck comparing",
    moodWisdom: "Tired, doubting your own worth",
    moodHumanRead: "Curious, hoping for kinship",
    moodHumanWrite: "Generous, nervous, reaching outward",
    moodHumanDefault: "Heavy, wanting to be met gently",
  },
  CN: {
    wit: "你可以很累，也依然值得被温柔对待。今天很吵，但你还在和自己站在一起。",
    wisdom: "别再把自己写成失败者。说出你一直在回避的一个事实，然后专注行动十分钟。",
    humanDefault: "你说的话很重要。接下来一小时里，为自己做一件小事，站在自己这边。",
    humanRead: "世界上有人正背着与你相似的一章。慢慢读，也让自己少一点孤单。",
    humanWrite: "你的一句话，也许会成为别人一天的转折。写一句真实的话，然后让它去到远方。",
    moodWit: "焦虑，有些陷在比较里",
    moodWisdom: "疲惫，怀疑自己的价值",
    moodHumanRead: "好奇，希望从他人的经历里获得共鸣",
    moodHumanWrite: "善意又紧张，想把力量传出去",
    moodHumanDefault: "沉重，想被认真接住",
  },
  DE: {
    wit: "Du darfst so mude sein und trotzdem wertvoll bleiben. Der Tag war laut, aber du bist bei dir geblieben.",
    wisdom:
      "Hor auf, deine Geschichte wie eine Niederlage zu erzahlen. Benenne eine Wahrheit, die du vermeidest, und handle zehn Minuten fokussiert.",
    humanDefault:
      "Was du gesagt hast, zahlt. Tu in der nachsten Stunde eine kleine Sache, die klar auf deiner Seite ist.",
    humanRead:
      "Irgendwo tragt jemand ein Kapitel, das sich wie deins anfuhlt. Lies behutsam und lass dich weniger allein fuhlen.",
    humanWrite:
      "Dein Satz kann zum Wendepunkt im Tag eines anderen werden. Schreib eine ehrliche Zeile und lass sie los.",
    moodWit: "Unruhig, etwas im Vergleich festgefahren",
    moodWisdom: "Mude, am eigenen Wert zweifelnd",
    moodHumanRead: "Neugierig, auf Verbundenheit hoffend",
    moodHumanWrite: "Großzugig, nervos, nach außen gerichtet",
    moodHumanDefault: "Schwer, mit dem Wunsch ernsthaft gehalten zu werden",
  },
  FR: {
    wit: "Tu as le droit d'etre fatigue et de rester precieux. La journee etait bruyante, mais tu es reste avec toi-meme.",
    wisdom:
      "Arrete de raconter ta vie comme une defaite deja decidee. Nomme une verite que tu evites, puis agis dix minutes avec focus.",
    humanDefault:
      "Ce que tu as dit compte. Dans l'heure qui vient, fais un petit geste clairement de ton cote.",
    humanRead:
      "Quelque part, quelqu'un porte un chapitre qui ressemble au tien. Lis doucement et laisse la solitude reculer.",
    humanWrite:
      "Ta phrase peut devenir un pivot dans la journee de quelqu'un. Ecris une ligne vraie et laisse-la partir.",
    moodWit: "Anxieux, un peu coince dans la comparaison",
    moodWisdom: "Fatigue, en doute sur ta valeur",
    moodHumanRead: "Curieux, en quete de resonance",
    moodHumanWrite: "Genereux, nerveux, tourne vers les autres",
    moodHumanDefault: "Lourd, avec le besoin d'etre accueilli sans jugement",
  },
  IT: {
    wit: "Puoi essere stanco e restare comunque prezioso. La giornata era rumorosa, ma sei rimasto vicino a te stesso.",
    wisdom:
      "Smettila di raccontare la tua vita come una sconfitta gia scritta. Nomina una verita che stai evitando e agisci per dieci minuti.",
    humanDefault:
      "Quello che hai detto conta. Nella prossima ora, fai una piccola cosa chiaramente dalla tua parte.",
    humanRead:
      "Da qualche parte, qualcuno porta un capitolo simile al tuo. Leggi con delicatezza e lascia entrare un po di vicinanza.",
    humanWrite:
      "La tua frase puo diventare la svolta nella giornata di qualcuno. Scrivi una riga vera e lasciala andare.",
    moodWit: "Ansioso, un po bloccato nel confronto",
    moodWisdom: "Stanco, in dubbio sul tuo valore",
    moodHumanRead: "Curioso, in cerca di risonanza",
    moodHumanWrite: "Generoso, nervoso, rivolto verso gli altri",
    moodHumanDefault: "Appesantito, con bisogno di essere accolto",
  },
};

function mockResponse(userText, mode, humanChoice, lang) {
  const l = MOCK_BY_LANG[lang] || MOCK_BY_LANG.EN;
  let reply = l.wisdom;
  let mood = l.moodWisdom;
  if (mode === "wit") {
    reply = l.wit;
    mood = l.moodWit;
  } else if (mode === "human") {
    if (humanChoice === "read") {
      reply = l.humanRead;
      mood = l.moodHumanRead;
    } else if (humanChoice === "write") {
      reply = l.humanWrite;
      mood = l.moodHumanWrite;
    } else {
      reply = l.humanDefault;
      mood = l.moodHumanDefault;
    }
  }
  return { mood, reply, userLine: userText.trim() || userText };
}

async function openaiJsonChat(apiKey, system, user, temperature) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty model response");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Model returned non-JSON");
  }
}

async function geminiJsonChat(apiKey, system, user, temperature) {
  const model = GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const finish = candidate?.finishReason;
  if (finish && finish !== "STOP" && finish !== "MAX_TOKENS") {
    throw new Error(`Gemini blocked or incomplete (${finish}).`);
  }
  const raw = candidate?.content?.parts?.[0]?.text?.trim();
  if (!raw) throw new Error("Empty Gemini response");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned non-JSON");
  }
}

async function runGeminiReceipt(apiKey, userText, mode, humanChoice, lang) {
  const jsonChat = (s, u, t) => geminiJsonChat(apiKey, s, u, t);
  const user = buildReceiptUserMessage(userText, mode, humanChoice);
  const temperature = temperatureForMode(mode);

  const parsed = await jsonChat(buildReceiptSystemPrompt(lang), user, temperature);
  const mood = typeof parsed.mood === "string" ? parsed.mood : "";
  const reply = typeof parsed.reply === "string" ? parsed.reply : "";
  const userLine =
    typeof parsed.userLine === "string" && parsed.userLine.trim()
      ? parsed.userLine.trim()
      : userText;
  if (!reply) throw new Error("Missing reply in model JSON");
  return { mood, reply, userLine };
}

async function runOpenAIReceipt(apiKey, userText, mode, humanChoice, lang) {
  const jsonChat = (s, u, t) => openaiJsonChat(apiKey, s, u, t);
  const user = buildReceiptUserMessage(userText, mode, humanChoice);
  const temperature = temperatureForMode(mode);

  const parsed = await jsonChat(buildReceiptSystemPrompt(lang), user, temperature);
  const mood = typeof parsed.mood === "string" ? parsed.mood : "";
  const reply = typeof parsed.reply === "string" ? parsed.reply : "";
  const userLine =
    typeof parsed.userLine === "string" && parsed.userLine.trim()
      ? parsed.userLine.trim()
      : userText;
  if (!reply) throw new Error("Missing reply in model JSON");
  return { mood, reply, userLine };
}

async function generateReceiptWithLLM(userText, mode, humanChoice, lang) {
  try {
    const googleKey =
      process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (googleKey) {
      return await runGeminiReceipt(googleKey, userText, mode, humanChoice, lang);
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      return await runOpenAIReceipt(openaiKey, userText, mode, humanChoice, lang);
    }
  } catch (err) {
    console.warn("LLM request failed, falling back to mock response:", err?.message || err);
  }
  return mockResponse(userText, mode, humanChoice, lang);
}

async function runGeminiTranslate(apiKey, text, targetLang) {
  const parsed = await geminiJsonChat(
    apiKey,
    buildTranslateSystemPrompt(targetLang),
    text,
    0.2,
  );
  const out = typeof parsed.text === "string" ? parsed.text.trim() : "";
  return {
    text: out || text,
    detectedLang:
      typeof parsed.detectedLang === "string" ? parsed.detectedLang : "unknown",
    translated: Boolean(parsed.translated),
  };
}

async function runOpenAITranslate(apiKey, text, targetLang) {
  const parsed = await openaiJsonChat(
    apiKey,
    buildTranslateSystemPrompt(targetLang),
    text,
    0.2,
  );
  const out = typeof parsed.text === "string" ? parsed.text.trim() : "";
  return {
    text: out || text,
    detectedLang:
      typeof parsed.detectedLang === "string" ? parsed.detectedLang : "unknown",
    translated: Boolean(parsed.translated),
  };
}

async function translateText(text, targetLang) {
  const safeText = String(text || "").trim();
  if (!safeText) return { text: "", detectedLang: "unknown", translated: false };

  try {
    const googleKey =
      process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (googleKey) {
      return await runGeminiTranslate(googleKey, safeText, targetLang);
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      return await runOpenAITranslate(openaiKey, safeText, targetLang);
    }
  } catch (err) {
    console.warn("Translate request failed, returning original text:", err?.message || err);
  }
  return { text: safeText, detectedLang: "unknown", translated: false };
}

app.post("/api/box", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { text, humanChoice: rawHc } = body;
    const lang = normalizeLang(body.lang);
    const rawMode = body.mode;
    const mode =
      typeof rawMode === "string"
        ? rawMode.trim().toLowerCase()
        : rawMode != null
          ? String(rawMode).trim().toLowerCase()
          : "";

    let t = typeof text === "string" ? text.trim() : "";
    const humanChoice =
      rawHc === "read" || rawHc === "write" ? rawHc : undefined;

    if (!t) {
      if (mode === "human" && humanChoice) {
        const fallbackByLang = {
          EN:
            humanChoice === "read"
              ? "I want to read someone else's story."
              : "I want to leave a message for someone else.",
          CN:
            humanChoice === "read"
              ? "我想读读别人的故事。"
              : "我想给别人留一段话。",
          DE:
            humanChoice === "read"
              ? "Ich mochte die Geschichte von jemand anderem lesen."
              : "Ich mochte jemand anderem eine Nachricht hinterlassen.",
          FR:
            humanChoice === "read"
              ? "Je veux lire l'histoire de quelqu'un d'autre."
              : "Je veux laisser un message a quelqu'un d'autre.",
          IT:
            humanChoice === "read"
              ? "Voglio leggere la storia di qualcun altro."
              : "Voglio lasciare un messaggio a qualcun altro.",
        };
        t = fallbackByLang[lang] || fallbackByLang.EN;
      } else {
        return res.status(400).json({ error: "Say something first." });
      }
    }
    if (mode !== "wit" && mode !== "wisdom" && mode !== "human") {
      return res.status(400).json({
        error:
          "Mode must be wit, wisdom, or human (check that the server was restarted after updating).",
      });
    }

    const result = await generateReceiptWithLLM(t, mode, humanChoice, lang);
    res.json({
      ...result,
      mode,
      lang,
      usedMock: !llmConfigured(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e.message || "Server error",
    });
  }
});

app.post("/api/translate", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const targetLang = normalizeLang(body.targetLang);
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }
    const result = await translateText(text, targetLang);
    res.json({ ...result, targetLang });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e.message || "Server error",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("  Schrödinger's Box is running — open in your browser:");
  console.log(`    http://127.0.0.1:${PORT}`);
  console.log(`    http://localhost:${PORT}`);
  console.log("  (Keep this terminal open; closing it stops the page.)");
  console.log("");
  if (!llmConfigured()) {
    console.log("  No GOOGLE_AI_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY — mock replies.");
    console.log("");
  } else if (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    console.log(`  Gemini model: ${GEMINI_MODEL}`);
    console.log("");
  } else {
    console.log(`  OpenAI model: ${MODEL}`);
    console.log("");
  }
});
