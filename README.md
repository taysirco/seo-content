# نظام كتابة المحتوى SEO | SEO Content Writing System

نظام متكامل من 13 خطوة لتحليل المنافسين وكتابة محتوى SEO احترافي باستخدام الذكاء الاصطناعي (Google Gemini).

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React + TailwindCSS + shadcn/ui + Lucide icons
- **AI**: Google Gemini API (`gemini-2.0-flash`)
- **State**: Zustand with localStorage persistence
- **Parsing**: Cheerio (HTML content extraction)
- **Deploy**: Firebase App Hosting
- **Storage**: Firestore (optional)
- **Language**: Arabic-first RTL interface

## 13-Step Pipeline

| Step | Name | Type |
|------|------|------|
| 1 | Competitor Research | Data (SERP) |
| 2 | Outline Creation | AI |
| 3 | Content Extraction | Data (Cheerio) |
| 4 | Entities (Competitors) | AI |
| 5 | Entities (AI-Generated) | AI |
| 6 | N-Grams | AI (3 phases) |
| 7 | NLP Keywords | AI |
| 8 | Skip-Grams | AI |
| 9 | Auto Suggest | Google API + AI |
| 10 | Grammar Generator | AI |
| 11 | SEO Rules | Config |
| 12 | AI Instructions | Config |
| 13 | Final Content | AI (Streaming) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required:
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)

Optional:
- `SERPAPI_KEY` — from [serpapi.com](https://serpapi.com) (for automatic SERP results)
- Firebase config vars (for cloud persistence)

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Firebase

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase apphosting:backends:create
firebase apphosting:secrets:set gemini-api-key
firebase apphosting:backends:deploy
```

## Project Structure

```
src/
  app/                    # Next.js pages + API routes
    api/                  # 10 API endpoints
      serp/               # SERP URL builder + SerpAPI
      extract/            # HTML content extraction
      autocomplete/       # Google Suggest proxy
      ai/                 # AI-powered analysis routes
        outline/          # Step 2: Merge outlines
        entities/         # Steps 4+5: Entity analysis
        ngrams/           # Step 6: N-gram pipeline
        nlp-keywords/     # Step 7: NLP keyword analysis
        skip-grams/       # Step 8: Skip-gram generation
        grammar/          # Step 10: Linguistic analysis
        generate/         # Step 13: Streaming content
    project/new/          # 13-step wizard page
  components/
    pipeline/             # Stepper + StepContainer
    steps/                # 13 step UI components
    ui/                   # shadcn/ui components
  lib/
    ai-client.ts          # Gemini API wrapper
    ai-response-validator.ts # Type-safe validation
    content-extractor.ts  # Cheerio HTML parser
    firebase.ts           # Firestore CRUD
    locations-db.ts       # 32 Saudi cities
    seo-rules-library.ts  # 10 predefined SEO rules
    serp-url-builder.ts   # Google SERP URL construction
    uule-encoder.ts       # Location spoofing
    prompts/              # All AI prompt templates
  store/
    pipeline-store.ts     # Zustand state management
  types/
    pipeline.ts           # TypeScript interfaces
```
