import { isProduction } from '../config/env';

export interface GenerateAIRequest {
  prompt: string;
  systemInstruction?: string;
  contextData?: Record<string, unknown>;
}

export interface GenerateAIResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export const aiService = {
  /**
   * Send an AI generation request.
   * In Development: Uses local AI processing or dev mock.
   * In Production: Calls serverless Netlify Function at `/.netlify/functions/gemini`
   * which securely holds GEMINI_API_KEY.
   */
  async generateText(request: GenerateAIRequest): Promise<GenerateAIResponse> {
    const { prompt, systemInstruction, contextData } = request;

    // PRODUCTION: Proxy through server-side Netlify Function
    if (isProduction()) {
      try {
        const response = await fetch('/.netlify/functions/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            systemInstruction,
            contextData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `AI function returned HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          text: data.text || data.output || '',
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to communicate with AI service';
        console.error('Production AI call failed:', msg);
        return {
          success: false,
          error: msg,
        };
      }
    }

    // DEVELOPMENT: Local development fallback / helper
    try {
      // In development mode, return an intelligent contextual development summary
      const summary = `[DEV MODE AI ASSISTANT] Analysis for query: "${prompt.slice(0, 80)}..."\nSystem Context: ${systemInstruction || 'Hostel Operations Management'}\nSummary: Data validated successfully across active property operations.`;
      return {
        success: true,
        text: summary,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dev AI error';
      return { success: false, error: msg };
    }
  },
};
