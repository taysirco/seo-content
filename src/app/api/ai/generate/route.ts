import { NextRequest } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { streamGemini } from '@/lib/ai-client';
import { buildMegaPrompt } from '@/lib/prompts/mega-prompt-builder';
import {
  getSystemInstruction, buildIntroPrompt, buildSectionPrompt,
  buildConclusionPrompt, parseSectionTasks,
} from '@/lib/prompts/section-prompt-builder';
import type { PipelineState } from '@/types/pipeline';

function buildState(body: Record<string, unknown>): PipelineState {
  return {
    projectId: '',
    keyword: (body.keyword as string) || '',
    location: (body.location as PipelineState['location']) || null,
    clientMeta: (body.clientMeta as PipelineState['clientMeta']) || null,
    currentStep: 13,
    status: 'processing',
    error: null,
    step1: body.step1 as PipelineState['step1'] || null,
    step2: body.step2 as PipelineState['step2'] || null,
    step3: body.step3 as PipelineState['step3'] || null,
    step4: body.step4 as PipelineState['step4'] || null,
    step5: body.step5 as PipelineState['step5'] || null,
    step6: body.step6 as PipelineState['step6'] || null,
    step7: body.step7 as PipelineState['step7'] || null,
    step8: body.step8 as PipelineState['step8'] || null,
    step9: body.step9 as PipelineState['step9'] || null,
    step10: body.step10 as PipelineState['step10'] || null,
    step11: body.step11 as PipelineState['step11'] || null,
    step12: body.step12 as PipelineState['step12'] || null,
    step13: null,
  };
}

/** Stream a generator directly to the controller while accumulating text for getTail */
async function streamAndCollect(
  gen: AsyncGenerator<string>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<string> {
  let full = '';
  for await (const chunk of gen) {
    controller.enqueue(encoder.encode(chunk));
    full += chunk;
  }
  return full;
}

/** Get the last ~150 words of a text block for narrative continuity */
function getTail(html: string, words = 150): string {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const arr = plain.split(' ');
  return arr.slice(-words).join(' ');
}

/** Emit a progress marker as an HTML comment the frontend can parse */
function emitProgress(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  current: number,
  total: number,
  label: string,
) {
  controller.enqueue(encoder.encode(`<!-- PROGRESS:${current}/${total}:${label} -->`));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const state = buildState(body);
    const sectionOnly: string | undefined = body.sectionOnly as string | undefined;
    const auditFix: string | undefined = body.auditFix as string | undefined;
    const chunked: boolean = body.chunked === true;
    const useGrounding: boolean = body.useGrounding === true;

    const encoder = new TextEncoder();

    // ─── MODE 1: Single section regeneration (with full SEO context) ───
    if (sectionOnly) {
      const sysPrompt = getSystemInstruction(state);
      // D7: Build a rich prompt using the section-prompt-builder if outline is available
      const sections = state.step2?.merged?.headings?.length ? parseSectionTasks(state) : [];
      const matchedSection = sections.find(s => s.heading === sectionOnly);
      let userPrompt: string;
      if (matchedSection) {
        userPrompt = buildSectionPrompt(state, matchedSection, '');
      } else {
        userPrompt = `Rewrite ONLY the section titled "${sectionOnly}" for an article about "${state.keyword}".
Output ONLY the HTML for this one section, starting with <h2>${sectionOnly}</h2>.
Do NOT include any other sections.`;
      }
      // W9-1: Append audit fix context if provided
      if (auditFix) {
        userPrompt += `\n\nAUDIT FIX REQUIRED: The SEO Auditor flagged this section with the following issue: "${auditFix}". You MUST fix this specific problem in your rewrite.`;
      }

      const stream = streamGemini({ systemInstruction: sysPrompt, userPrompt, temperature: 0.7, maxOutputTokens: 8192, useGrounding });
      const readable = new ReadableStream({
        async start(controller) {
          try { for await (const chunk of stream) { controller.enqueue(encoder.encode(chunk)); } controller.close(); }
          catch (error) { controller.error(error); }
        },
      });
      return new Response(readable, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache' } });
    }

    // ─── MODE 2: Agentic Chunked Generation (section-by-section) ───
    if (chunked && state.step2?.merged?.headings?.length) {
      const sections = parseSectionTasks(state);
      const sysPrompt = getSystemInstruction(state);

      const totalPhases = sections.length + 2; // intro + sections + conclusion
      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Phase 1: Introduction
            emitProgress(controller, encoder, 1, totalPhases, 'Introduction / المقدمة');
            const introPrompt = buildIntroPrompt(state);
            // Phase 4A: Auto-enable grounding for intro — it benefits most from fresh stats/data
            const introHtml = await streamAndCollect(streamGemini({ systemInstruction: sysPrompt, userPrompt: introPrompt, temperature: 0.7, maxOutputTokens: 4096, useGrounding: true }), controller, encoder);
            let previousTail = getTail(introHtml);

            // Phase 2: Each H2 section — stream tokens directly (with error recovery)
            for (const section of sections) {
              emitProgress(controller, encoder, section.sectionIndex + 2, totalPhases, section.heading);
              try {
                const sectionPrompt = buildSectionPrompt(state, section, previousTail);
                const sectionHtml = await streamAndCollect(streamGemini({ systemInstruction: sysPrompt, userPrompt: sectionPrompt, temperature: 0.7, maxOutputTokens: 6144, useGrounding }), controller, encoder);
                previousTail = getTail(sectionHtml);
              } catch (sectionErr) {
                // Emit error marker — frontend can detect and offer re-generation
                const errMsg = sectionErr instanceof Error ? sectionErr.message : 'Unexpected error';
                controller.enqueue(encoder.encode(`\n<!-- SECTION_ERROR:${section.heading} -->\n<div class="section-error" style="border:2px solid #ef4444;padding:16px;border-radius:8px;margin:16px 0;background:#fef2f2"><h2>${section.heading}</h2><p style="color:#dc2626">⚠️ Section generation failed: ${errMsg}</p><p style="color:#6b7280;font-size:14px">Click to regenerate this section.</p></div>\n`));
              }
            }

            // Phase 3: Conclusion + FAQ + Meta
            emitProgress(controller, encoder, totalPhases, totalPhases, 'Conclusion & FAQ / الخاتمة');
            try {
              const conclusionPrompt = buildConclusionPrompt(state, previousTail);
              await streamAndCollect(streamGemini({ systemInstruction: sysPrompt, userPrompt: conclusionPrompt, temperature: 0.7, maxOutputTokens: 6144, useGrounding }), controller, encoder);
            } catch (concErr) {
              const errMsg = concErr instanceof Error ? concErr.message : 'Unexpected error';
              controller.enqueue(encoder.encode(`\n<!-- SECTION_ERROR:Conclusion -->\n<div class="section-error" style="border:2px solid #ef4444;padding:16px;border-radius:8px;margin:16px 0;background:#fef2f2"><h2>Conclusion</h2><p style="color:#dc2626">⚠️ Conclusion generation failed: ${errMsg}</p></div>\n`));
            }

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readable, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache' } });
    }

    // ─── MODE 3: Legacy single-shot generation (fallback) ───
    const { system, user } = buildMegaPrompt(state);
    const stream = streamGemini({ systemInstruction: system, userPrompt: user, temperature: 0.7, maxOutputTokens: 32768, useGrounding });

    const readable = new ReadableStream({
      async start(controller) {
        try { for await (const chunk of stream) { controller.enqueue(encoder.encode(chunk)); } controller.close(); }
        catch (error) { controller.error(error); }
      },
    });

    return new Response(readable, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Transfer-Encoding': 'chunked', 'Cache-Control': 'no-cache' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: friendlyError(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
