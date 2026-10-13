# Schrödinger's Box

## 中文

一台会回话的机器。用户把一句话交给盒子，再选择一条路径：

- **Wit**：温暖、机智，带一点意外。
- **Wisdom**：更直接，少铺垫。
- **Human**：读别人留下的纸条，或给陌生人留一句话。

盒子会推断语气，把用户原话和回应印成一张热敏收据。界面支持英语、简体中文、德语、法语、意大利语，并可用麦克风输入。

未配置模型密钥时，仍会返回本地示例回复，方便演示。

### 环境要求

- Node.js 18 或更高版本
- 语音识别建议使用 Chrome（依赖浏览器的 `SpeechRecognition` / `webkitSpeechRecognition`）

### 快速开始

```bash
npm install
cp .env.example .env
npm start
```

浏览器打开 [http://localhost:3847](http://localhost:3847)。

默认端口是 `3847`。需要换端口时：

```bash
PORT=3000 npm start
```

保持终端开着。关掉终端，页面也会停。

### 配置

复制 `.env.example` 为 `.env`，至少填一个模型密钥。优先级是 Gemini，其次 OpenAI。两个都不填时走本地示例回复。

| 变量 | 说明 |
| --- | --- |
| `GOOGLE_AI_API_KEY` | Google AI Studio 的 Gemini 密钥。填写后优先使用。 |
| `GEMINI_API_KEY` | 与上一行等价的别名。 |
| `GEMINI_MODEL` | 默认 `gemini-2.5-flash`。 |
| `OPENAI_API_KEY` | 没有 Gemini 密钥时使用。 |
| `OPENAI_MODEL` | 默认 `gpt-4o-mini`。 |
| `PORT` | 服务端口，默认 `3847`。 |

模型调用失败时，收据接口会退回本地示例回复；翻译接口会保留原文。

### 怎么用

1. 屏幕右上角切换语言（IT / EN / CN / FR / DE）。界面文案、语音识别语言和模型输出语言会一起切换。
2. 在屏幕里输入文字，或点麦克风说话。说完后，服务端会把识别结果整理成当前界面语言。
3. 按 **Wit** 或 **Wisdom**，右侧打印机吐出收据。
4. 按指纹按钮进入 **Human**：
   - 读别人的故事：屏幕上散落一组匿名纸条。
   - 给别人留言：写完后点 POST，盒子会印出一张收据。

语言选择会记在浏览器本地。收据最多保留 40 张。

### 项目结构

```text
server.mjs          Express 服务：收据生成与翻译
public/index.html   页面
public/app.js       交互、五种语言文案、语音识别
public/styles.css   样式
public/assets/      屏幕视频、麦克风图标、打印音效
.env.example        环境变量示例
```

### 接口

`POST /api/box`

```json
{
  "text": "今天有点累",
  "mode": "wit",
  "lang": "CN",
  "humanChoice": "read"
}
```

`mode` 为 `wit`、`wisdom` 或 `human`。`lang` 为 `EN`、`CN`、`DE`、`FR`、`IT`。`humanChoice` 只在 Human 路径使用，取 `read` 或 `write`。

返回 `mood`、`reply`、`userLine`，以及 `usedMock`（是否使用了本地示例）。

`POST /api/translate`

```json
{
  "text": "I am tired",
  "targetLang": "CN"
}
```

返回 `text`、`detectedLang`、`translated`。

### 贡献人

- **Wang Yining（王一宁）**：主程序 & UI页面设计
- **Rohini Jayashankar、Srujan Ramakant Unavane**：产品设计
- **Lu Sijia（芦思佳）**：项目使用场景的AI图片与视频生成

---

## English

A speaking machine. You give it a sentence, then choose a path:

- **Wit**: warm, clever, with a small surprise.
- **Wisdom**: sharper and more direct, with little cushioning.
- **Human**: read notes left by others, or leave a message for a stranger.

The box infers the tone and prints the user's line and its reply as a thermal receipt. The interface supports English, Simplified Chinese, German, French, and Italian, and accepts microphone input.

If no model key is configured, it still returns a local sample reply for demos.

### Requirements

- Node.js 18 or later
- Chrome is recommended for voice input (it uses the browser `SpeechRecognition` / `webkitSpeechRecognition` API)

### Quick start

```bash
npm install
cp .env.example .env
npm start
```

Open [http://localhost:3847](http://localhost:3847) in a browser.

The default port is `3847`. To use another port:

```bash
PORT=3000 npm start
```

Keep the terminal open. Closing it stops the page.

### Configuration

Copy `.env.example` to `.env` and fill in at least one model key. Gemini is used first, then OpenAI. If neither is set, the app uses local sample replies.

| Variable | Description |
| --- | --- |
| `GOOGLE_AI_API_KEY` | Gemini key from Google AI Studio. Used first when set. |
| `GEMINI_API_KEY` | Alias for the row above. |
| `GEMINI_MODEL` | Default `gemini-2.5-flash`. |
| `OPENAI_API_KEY` | Used when no Gemini key is set. |
| `OPENAI_MODEL` | Default `gpt-4o-mini`. |
| `PORT` | Server port. Default `3847`. |

If a model call fails, the receipt endpoint falls back to a local sample reply, and the translate endpoint keeps the original text.

### How to use

1. Switch language in the top-right of the screen (IT / EN / CN / FR / DE). Interface copy, speech recognition, and model output all follow that choice.
2. Type on the screen, or tap the microphone and speak. After you finish, the server cleans the transcript into the current interface language.
3. Press **Wit** or **Wisdom**. The printer on the right feeds out a receipt.
4. Press the fingerprint button for **Human**:
   - Read someone else's story: anonymous notes scatter across the screen.
   - Leave a message: write it, press POST, and the box prints a receipt.

The language choice is stored in the browser. Up to 40 receipts are kept.

### Project structure

```text
server.mjs          Express server: receipts and translation
public/index.html   Page
public/app.js       Interaction, five-language copy, speech recognition
public/styles.css   Styles
public/assets/      Screen video, microphone icon, print sound
.env.example        Environment variable example
```

### API

`POST /api/box`

```json
{
  "text": "今天有点累",
  "mode": "wit",
  "lang": "CN",
  "humanChoice": "read"
}
```

`mode` is `wit`, `wisdom`, or `human`. `lang` is `EN`, `CN`, `DE`, `FR`, or `IT`. `humanChoice` is only for the Human path: `read` or `write`.

The response includes `mood`, `reply`, `userLine`, and `usedMock` (whether a local sample was used).

`POST /api/translate`

```json
{
  "text": "I am tired",
  "targetLang": "CN"
}
```

The response includes `text`, `detectedLang`, and `translated`.

### Contributors

- **Wang Yining (王一宁)**: Programing & UI Design
- **Rohini Jayashankar, Srujan Ramakant Unavane**: Product Design
- **Lu Sijia (芦思佳)**: AI image and video generation for the use cases
