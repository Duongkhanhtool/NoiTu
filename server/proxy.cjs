/**
 * Local proxy server for Nối Từ game.
 *
 * Solves two CORS issues:
 * 1. Google Translate TTS — browser can't fetch audio directly
 * 2. AI API (apikey247.com) — no CORS headers for browser requests
 *
 * Endpoints:
 *   GET  /tts?text=...        → Streams Google Translate TTS audio
 *   POST /api/chat/completions → Proxies to the AI API
 *   GET  /health              → Health check
 *
 * Run: node server/proxy.js
 * Listens on port 3001
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow all origins (for Vercel frontend to call Render backend)
app.use(cors());
app.use(express.json());

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Nối Từ proxy server' });
});

// ── TTS Proxy ──
// GET /tts?text=xin+chào&slow=false
app.get('/tts', async (req, res) => {
  const text = req.query.text;
  if (!text) {
    return res.status(400).json({ error: 'Missing ?text= parameter' });
  }

  const slow = req.query.slow === 'true';
  const speed = slow ? '0.24' : '1';
  const encoded = encodeURIComponent(text);

  const url =
    `https://translate.google.com.vn/translate_tts` +
    `?ie=UTF-8` +
    `&q=${encoded}` +
    `&tl=vi` +
    `&total=1` +
    `&idx=0` +
    `&textlen=${text.length}` +
    `&client=tw-ob` +
    `&ttsspeed=${speed}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com.vn/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TTS request failed' });
    }

    // Stream the audio back
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache 24h

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('TTS proxy error:', err.message);
    res.status(500).json({ error: 'TTS proxy failed' });
  }
});

// ── AI API Proxy ──
// POST /api/chat/completions
// Body: { baseUrl, apiKey, ...openaiBody }
// Handles both regular JSON and SSE streaming responses
app.post('/api/chat/completions', async (req, res) => {
  const { baseUrl, apiKey, ...body } = req.body;

  if (!baseUrl || !apiKey) {
    return res.status(400).json({ error: 'Missing baseUrl or apiKey' });
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  // Force non-streaming by setting stream: false
  body.stream = false;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    if (!response.ok) {
      try {
        return res.status(response.status).json(JSON.parse(rawText));
      } catch {
        return res.status(response.status).json({ error: rawText });
      }
    }

    // Try parsing as regular JSON first
    try {
      const data = JSON.parse(rawText);
      return res.json(data);
    } catch {
      // Not valid JSON — probably SSE stream format
    }

    // Parse SSE stream: "data: {...}\ndata: {...}\n...\ndata: [DONE]"
    if (rawText.includes('data: ')) {
      const lines = rawText.split('\n').filter(l => l.startsWith('data: '));
      let fullContent = '';
      let lastChunk = null;

      for (const line of lines) {
        const jsonStr = line.slice(6).trim(); // Remove "data: "
        if (jsonStr === '[DONE]') continue;

        try {
          const chunk = JSON.parse(jsonStr);
          lastChunk = chunk;
          // Accumulate content from delta
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
          }
        } catch {
          // Skip unparseable lines
        }
      }

      // Build a standard OpenAI-compatible response
      const assembled = {
        id: lastChunk?.id || 'proxy-assembled',
        object: 'chat.completion',
        model: lastChunk?.model || body.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: fullContent,
          },
          finish_reason: 'stop',
        }],
      };

      return res.json(assembled);
    }

    // Fallback: return raw text as content
    res.json({
      choices: [{
        message: { role: 'assistant', content: rawText.trim() },
        finish_reason: 'stop',
      }],
    });
  } catch (err) {
    console.error('AI proxy error:', err.message);
    res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
});

// ── Start ──
app.listen(PORT, () => {
  console.log('');
  console.log('  🔗 Nối Từ Proxy Server');
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log('');
  console.log('  Endpoints:');
  console.log('    GET  /tts?text=...           → Google TTS tiếng Việt');
  console.log('    POST /api/chat/completions   → AI API proxy');
  console.log('    GET  /health                 → Health check');
  console.log('');
});
