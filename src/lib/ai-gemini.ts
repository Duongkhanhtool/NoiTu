/**
 * AI API integration for the Nối Từ game.
 *
 * Uses the **local proxy server** (localhost:3001) to call the AI API,
 * bypassing CORS restrictions. The proxy forwards requests to the
 * actual API endpoint (e.g. api.apikey247.com).
 *
 * API format: OpenAI-compatible (chat/completions)
 */

import type { Difficulty } from '../types/game';
import { PROXY_URL } from './proxy-config';

export interface GeminiResponse {
  word: string | null;
  error?: string;
}

// ────────────────────────────────────────────────────
// Main query
// ────────────────────────────────────────────────────

/**
 * Ask the AI for a Vietnamese compound word via the proxy.
 *
 * The proxy at /api/chat/completions accepts:
 *   { baseUrl, apiKey, model, messages, ... }
 * and forwards to the real API.
 */
export async function findWordFromGemini(
  apiKey: string,
  model: string,
  baseUrl: string,
  lastSyllable: string,
  chain: string[],
  usedWords: Set<string>,
  difficulty: Difficulty,
): Promise<GeminiResponse> {
  const { systemPrompt, userPrompt } = buildPrompts(
    lastSyllable,
    chain,
    usedWords,
    difficulty,
  );

  try {
    const response = await fetch(`${PROXY_URL}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl,
        apiKey,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature:
          difficulty === 'easy' ? 0.9 : difficulty === 'medium' ? 0.7 : 0.5,
        max_tokens: 50,
        top_p: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        word: null,
        error: `API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;

    if (!text) {
      return { word: null, error: 'AI không trả về kết quả.' };
    }

    // Clean up
    const cleaned = text
      .trim()
      .split('\n')[0]
      .replace(/["""'''.!?,;:()[\]{}]/g, '')
      .replace(/^(từ|word|answer|trả lời)[\s:]+/i, '')
      .trim()
      .toLowerCase();

    if (!cleaned || cleaned.split(/\s+/).length < 2) {
      return { word: null, error: 'AI trả về từ không hợp lệ.' };
    }

    return { word: cleaned };
  } catch (err) {
    return {
      word: null,
      error: `Lỗi kết nối: ${err instanceof Error ? err.message : 'Unknown'}`,
    };
  }
}

// ────────────────────────────────────────────────────
// Connection test
// ────────────────────────────────────────────────────

export async function testGeminiConnection(
  apiKey: string,
  model: string,
  baseUrl: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`${PROXY_URL}/api/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl,
        apiKey,
        model,
        messages: [
          {
            role: 'user',
            content: 'Nói "xin chào" bằng tiếng Việt. Chỉ trả lời 2 từ.',
          },
        ],
        max_tokens: 20,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const map: Record<number, string> = {
        400: 'Request không hợp lệ. Kiểm tra model name.',
        401: 'API key không hợp lệ.',
        403: 'API key bị từ chối.',
        404: 'Endpoint không tìm thấy. Kiểm tra Base URL.',
        429: 'Quá nhiều request. Thử lại sau.',
      };
      return {
        success: false,
        error:
          map[response.status] ??
          `Lỗi API (${response.status}): ${data?.error?.message ?? ''}`,
      };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? '';

    return {
      success: true,
      message: `AI trả lời: "${reply}"`,
    };
  } catch (err) {
    return {
      success: false,
      error: `Không thể kết nối proxy. Chạy: node server/proxy.js`,
    };
  }
}

// ────────────────────────────────────────────────────
// Prompt builder
// ────────────────────────────────────────────────────

function buildPrompts(
  lastSyllable: string,
  chain: string[],
  usedWords: Set<string>,
  difficulty: Difficulty,
): { systemPrompt: string; userPrompt: string } {
  const usedList = [...usedWords].slice(-20).join(', ');

  const difficultyInstruction =
    difficulty === 'easy'
      ? 'Hãy chọn từ ĐƠN GIẢN, PHỔ BIẾN mà trẻ em 5-10 tuổi có thể biết.'
      : difficulty === 'medium'
        ? 'Hãy chọn từ phổ biến, không quá khó.'
        : 'Hãy chọn từ KHÓ, ÍT PHỔ BIẾN để thử thách người chơi.';

  const systemPrompt = `Bạn đang chơi trò Nối Từ tiếng Việt với một em nhỏ.

LUẬT CHƠI:
- Mỗi từ phải là từ ghép tiếng Việt có nghĩa (2 âm tiết trở lên)
- Từ tiếp theo phải BẮT ĐẦU bằng âm tiết cuối của từ trước
- Không được lặp lại từ đã dùng

QUY TẮC TRẢ LỜI:
- CHỈ trả lời DUY NHẤT từ ghép tiếng Việt
- KHÔNG giải thích, KHÔNG thêm dấu câu, KHÔNG viết gì khác
- Viết thường, ví dụ: học sinh`;

  const userPrompt = `${chain.length > 0 ? `Chuỗi từ: ${chain.slice(-5).join(' → ')}\n` : ''}Từ tiếp theo phải BẮT ĐẦU bằng: "${lastSyllable}"
Đã dùng: ${usedList || '(chưa có)'}
${difficultyInstruction}`;

  return { systemPrompt, userPrompt };
}
