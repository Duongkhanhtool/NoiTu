import { useSettings } from '../../App'
import { GEMINI_CONFIG } from '../../lib/gemini-config'
import { ALL_WORDS } from '../../data/dictionary-index'
import type { Difficulty } from '../../types/game'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings()

  if (!isOpen) return null

  const difficulties: { key: Difficulty; label: string; desc: string; time: number }[] = [
    { key: 'easy', label: '😊 Dễ', desc: '30 giây mỗi lượt, nhiều gợi ý', time: 30 },
    { key: 'medium', label: '🤔 Vừa', desc: '20 giây mỗi lượt', time: 20 },
    { key: 'hard', label: '😈 Khó', desc: '15 giây mỗi lượt, ít gợi ý', time: 15 },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold">⚙️ Cài đặt</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-6 max-h-[calc(85vh-4rem)]">

          {/* ── AI Mode ── */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              🤖 Chế độ AI
            </h3>

            {GEMINI_CONFIG.isConfigured ? (
              <>
                {/* Toggle */}
                <label className="flex items-center justify-between cursor-pointer mb-3">
                  <span className="font-medium">Dùng Gemini AI</span>
                  <ToggleSwitch
                    checked={settings.geminiEnabled}
                    onChange={(v) => updateSettings({ geminiEnabled: v })}
                  />
                </label>

                {settings.geminiEnabled && (
                  <div className="space-y-1 pl-1 animate-slide-up">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Model: <span className="font-mono">{GEMINI_CONFIG.model}</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      API: <span className="font-mono">{GEMINI_CONFIG.baseUrl}</span>
                    </p>
                    <p className="text-xs text-game-mint mt-1">
                      ✅ API key đã cấu hình trong .env
                    </p>
                  </div>
                )}

                {!settings.geminiEnabled && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Bot sẽ dùng từ điển có sẵn (~{ALL_WORDS.length.toLocaleString()} từ)
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chưa cấu hình API key. Thêm vào file <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">.env</code>:
                </p>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-xl overflow-x-auto font-mono">
{`VITE_GEMINI_API_KEY=sk-...
VITE_GEMINI_BASE_URL=https://...
VITE_GEMINI_MODEL=gemini-3.8-flash-high`}
                </pre>
                <p className="text-xs text-gray-400">
                  Sau khi thêm, restart <code className="font-mono">npm run dev</code>
                </p>
              </div>
            )}
          </section>

          {/* ── Difficulty ── */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              🎯 Độ khó
            </h3>
            <div className="space-y-2">
              {difficulties.map((d) => (
                <label
                  key={d.key}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    settings.difficulty === d.key
                      ? 'bg-game-ocean/10 dark:bg-game-ocean/20 ring-2 ring-game-ocean/30'
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    checked={settings.difficulty === d.key}
                    onChange={() =>
                      updateSettings({ difficulty: d.key, turnTimeLimit: d.time })
                    }
                    className="sr-only"
                  />
                  <span className="text-lg">{d.label}</span>
                  <div className="flex-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {d.desc}
                    </span>
                  </div>
                  {settings.difficulty === d.key && (
                    <span className="text-game-ocean font-bold">✓</span>
                  )}
                </label>
              ))}
            </div>
          </section>

          {/* ── Voice ── */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              🔊 Giọng nói
            </h3>
            <label className="flex items-center justify-between cursor-pointer mb-3">
              <span className="font-medium">Tự động đọc từ</span>
              <ToggleSwitch
                checked={settings.ttsEnabled}
                onChange={(v) => updateSettings({ ttsEnabled: v })}
              />
            </label>
            {settings.ttsEnabled && (
              <div className="animate-slide-up space-y-4">
                {/* TTS Source selector */}
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">
                    Nguồn giọng đọc
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateSettings({ ttsSource: 'google' })}
                      className={`p-3 rounded-xl text-left transition-all ${
                        (settings.ttsSource ?? 'google') === 'google'
                          ? 'bg-game-ocean/10 dark:bg-game-ocean/20 ring-2 ring-game-ocean/40'
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-sm font-bold">🌐 Google</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Tự nhiên, chuẩn tiếng Việt
                      </div>
                    </button>
                    <button
                      onClick={() => updateSettings({ ttsSource: 'browser' })}
                      className={`p-3 rounded-xl text-left transition-all ${
                        settings.ttsSource === 'browser'
                          ? 'bg-game-ocean/10 dark:bg-game-ocean/20 ring-2 ring-game-ocean/40'
                          : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-sm font-bold">💻 Trình duyệt</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Dùng voice hệ thống
                      </div>
                    </button>
                  </div>
                </div>

                {/* Test voice button */}
                <button
                  onClick={() => {
                    import('../../lib/tts').then(({ getTTSService }) => {
                      const tts = getTTSService()
                      tts.setSource(settings.ttsSource ?? 'google')
                      tts.setRate(settings.ttsRate)
                      tts.speak('xin chào, bạn đang chơi nối từ')
                    })
                  }}
                  className="w-full px-4 py-2.5 bg-game-mint/15 text-game-mint font-medium text-sm rounded-xl hover:bg-game-mint/25 transition-colors"
                >
                  🔊 Nghe thử giọng đọc
                </button>

                {/* Speed slider — only relevant for browser mode */}
                {settings.ttsSource === 'browser' && (
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">
                      Tốc độ đọc: {settings.ttsRate.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={settings.ttsRate}
                      onChange={(e) => updateSettings({ ttsRate: parseFloat(e.target.value) })}
                      className="w-full accent-game-ocean"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Chậm</span>
                      <span>Nhanh</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Sound ── */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              🎵 Âm thanh
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-medium">Hiệu ứng âm thanh</span>
              <ToggleSwitch
                checked={settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </label>
          </section>

          {/* ── Hints ── */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              💡 Gợi ý
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-medium">Hiển thị nút gợi ý</span>
              <ToggleSwitch
                checked={settings.showHints}
                onChange={(v) => updateSettings({ showHints: v })}
              />
            </label>
          </section>
        </div>
      </div>
    </div>
  )
}

/** Simple toggle switch component */
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? 'bg-game-ocean' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
