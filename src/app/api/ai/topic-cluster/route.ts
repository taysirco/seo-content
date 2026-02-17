import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { TOPIC_CLUSTER_SYSTEM, buildTopicClusterPrompt } from '@/lib/prompts/topic-cluster';

export async function POST(req: NextRequest) {
  try {
    const { keyword, lang, existingKeywords, domain } = await req.json() as {
      keyword: string;
      lang?: string;
      existingKeywords?: string[];
      domain?: string;
    };

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const result = await callGemini({
      systemInstruction: TOPIC_CLUSTER_SYSTEM,
      userPrompt: buildTopicClusterPrompt(keyword, lang || 'en', existingKeywords, domain),
      temperature: 0.3,
      maxOutputTokens: 4096,
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}
