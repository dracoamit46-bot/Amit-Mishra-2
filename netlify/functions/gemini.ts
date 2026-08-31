import { GoogleGenAI } from '@google/genai';

interface RequestBody {
  prompt?: string;
  systemInstruction?: string;
  contextData?: Record<string, unknown>;
}

export default async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'Server configuration error: GEMINI_API_KEY environment variable is missing on Netlify.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction =
      body.systemInstruction ||
      'You are HostelOps AI, an operations and staff management assistant for hostel managers and owners. Provide concise, actionable insights.';

    const fullPrompt = body.contextData
      ? `${prompt}\n\nContext Data:\n${JSON.stringify(body.contextData, null, 2)}`
      : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        text: response.text || '',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown AI processing error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
