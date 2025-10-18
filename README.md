# CareerAI

Small platform to generate AI-driven interview quizzes, industry insights and manage user assessments using Next.js, Clerk, Prisma and Google Generative AI.

## Quick overview
- Next.js (App Router) project
- Authentication via Clerk
- Postgres + Prisma for data
- Google Generative AI (Gemini) for content generation

## Requirements
- Node.js >= 18
- PostgreSQL (or any DB supported by Prisma)
- A Clerk project and API keys
- Google Generative API key with access to supported models

## Environment variables (.env)
Create a `.env` in project root with at least:
```
DATABASE_URL="postgresql://user:pass@host:port/db"
GEMINI_API_KEY="YOUR_GOOGLE_GENERATIVE_API_KEY"
CLERK_JWT_KEY="..."               # if using Clerk JWT server-side features
NEXT_PUBLIC_CLERK_FRONTEND_API="..."  # Clerk frontend key if required
```

Restart the dev server after editing `.env`.

## Setup & Run
1. Install deps:
```powershell
npm install
```

2. Prisma
```powershell
npx prisma generate
# If you changed schema:
npx prisma migrate dev --name init
```

3. Start dev server:
```powershell
npm run dev
# Local: http://localhost:3000
```

## Common fixes & notes

- Prisma selects / relations
  - Your `User` model uses a relation `industryInsight` (and `industryId`) — do not select `industry` directly on `User`.
  - Example correct selection (actions/interview.js):
  ```javascript
  // filepath: c:\Users\salav\OneDrive\Desktop\careerai\actions\interview.js
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      skills: true,
      industryId: true,
      industryInsight: { select: { industry: true } }
    }
  });
  ```

- Clerk middleware error: "auth() was called but Clerk can't detect usage of clerkMiddleware()"
  - Add Clerk middleware at project root: `middleware.js`
  - Example middleware:
  ```javascript
  // filepath: c:\Users\salav\OneDrive\Desktop\careerai\middleware.js
  import { clerkMiddleware } from "@clerk/nextjs/server";

  export default clerkMiddleware({
    // default options
  });

  export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  };
  ```

- Google Generative AI model errors (404 / model not found)
  - List available models with a small API route:
  ```javascript
  // filepath: c:\Users\salav\OneDrive\Desktop\careerai\app\api\models\route.js
  import { NextResponse } from "next/server";
  import { GoogleGenerativeAI } from "@google/generative-ai";

  export async function GET() {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const models = await genAI.listModels();
      return NextResponse.json(models);
    } catch (err) {
      console.error("List models error:", err);
      return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
  }
  ```
  - Visit: `http://localhost:3000/api/models` and pick a model id that supports the method you need (`generateContent` / `generateText` etc.) then update your code to use that exact model id.

- If Next/Turbopack uses the wrong workspace root
  - Remove extra lockfiles from parent folders or set `turbopack.root` in `next.config.js`.

- If compiled `.next` state seems stale
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

## Troubleshooting checklist
- Did you restart dev server after .env changes?
- Did you run `npx prisma generate` after schema changes?
- Use `api/models` to confirm available Gemini model id / supported methods.
- Ensure Clerk middleware exists and matcher covers your routes.
- Confirm DB connection (DATABASE_URL) is correct.

## Useful commands
```powershell
npm run dev
npx prisma generate
npx prisma migrate dev --name update
Remove-Item -Recurse -Force .next
```

## Where to edit
- Server actions / business logic: `actions/`
- API routes (app router): `app/api/`
- Prisma schema: `prisma/schema.prisma`
- Prisma client helper: `lib/prisma.js`

If you want, paste the output from `http://localhost:3000/api/models` or the full `actions/interview.js` file and I will produce the exact change you should save.
