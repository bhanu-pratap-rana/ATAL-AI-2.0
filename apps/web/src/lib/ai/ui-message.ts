import type { UIMessage } from "ai";

/**
 * Pull the plain-text body out of a v6 UIMessage.
 *
 * SDK 6 message shape: `{ parts: [{type:'text', text:'…'}, ...] }`.
 * Assistant streams arrive as a single text part most of the time, but
 * multi-part is allowed (tool calls, files, reasoning). We concatenate
 * every text part and ignore the rest, which matches what the chat UI
 * needs to render.
 *
 * PR-64: extracted from duplicated `messageText` helpers in
 * apps/web/src/app/app/ai-tools/tutor/page.tsx and
 * apps/web/src/app/app/learn/[moduleId]/[topicId]/page.tsx.
 * The server-side tutor chat route has its own narrower helper that
 * accepts the loose schema shape it just parsed.
 */
export function messageText(m: UIMessage): string {
  let out = "";
  for (const p of m.parts) {
    if (p.type === "text") out += p.text;
  }
  return out;
}
