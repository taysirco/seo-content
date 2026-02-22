import { NextRequest } from 'next/server';
import { callGemini } from '@/lib/ai-client';
import { friendlyError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { systemInstruction, userPrompt, temperature, jsonMode } = body;

        if (!userPrompt) {
            return new Response(JSON.stringify({ error: 'User prompt is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await callGemini({
            systemInstruction: systemInstruction || 'You are a helpful AI assistant.',
            userPrompt,
            temperature: temperature ?? 0.7,
            jsonMode: !!jsonMode,
        });

        return new Response(JSON.stringify({ result }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('API Tool Error:', error);
        return new Response(JSON.stringify({ error: friendlyError(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
