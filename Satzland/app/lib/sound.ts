let context: AudioContext | undefined;
export function playSound(kind: string, enabled = true, combo = 1) {
  if (!enabled) return;
  try {
    context ||= new AudioContext(); void context.resume();
    const tones = kind === 'perfect' ? [523, 659, 784, 1047] : kind === 'accepted' ? [523, 659, 784] : kind === 'finish' ? [392, 523, 659, 784, 1047, 1319] : kind === 'hint' ? [440, 523] : kind === 'tap' ? [880] : [220, 175, 146];
    tones.forEach((frequency, index) => {
      const oscillator = context!.createOscillator(), gain = context!.createGain(), start = context!.currentTime + index * .075;
      oscillator.type = kind === 'wrong' ? 'triangle' : 'sine'; oscillator.frequency.value = frequency * (kind === 'perfect' ? 1 + Math.min(combo - 1, 5) * .04 : 1);
      const volume = kind === 'tap' ? .05 : .12, length = kind === 'tap' ? .08 : .28;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .012); gain.gain.exponentialRampToValueAtTime(.001, start + length);
      oscillator.connect(gain); gain.connect(context!.destination); oscillator.start(start); oscillator.stop(start + length + .02);
    });
  } catch { /* Sound is optional when Web Audio is unavailable. */ }
}

export type VoicePrefs = { voice: string; pitch: number };
export const voiceTag = (voice: SpeechSynthesisVoice) => voice.lang.replace('_', '-').toLowerCase();
const quality = (voice: SpeechSynthesisVoice) => /natural|neural|online|premium|enhanced/i.test(voice.name) ? 1 : 0;
// Microsoft's online voice Gisela is recorded as a child's voice.
export const childVoice = /\bGisela\b/;
export function germanVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const order = ['de-de', 'de-at', 'de-ch'], rank = (v: SpeechSynthesisVoice) => { const i = order.findIndex(o => voiceTag(v).startsWith(o)); return i < 0 ? order.length : i; };
  return speechSynthesis.getVoices().filter(v => voiceTag(v).startsWith('de')).sort((a, b) => rank(a) - rank(b) || quality(b) - quality(a) || a.name.localeCompare(b.name));
}
export function pickVoice(prefs: Pick<VoicePrefs, 'voice'> = { voice: '' }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = germanVoices();
  // A chosen voice may be missing on another device; the best German voice takes over there.
  return voices.find(v => v.name === prefs.voice) || voices.find(v => voiceTag(v) === 'de-de') || voices[0] || null;
}
// Dictation speed: slow and clear; the Hörlabor slows down further.
export const SPEECH_RATE = .8;
// Every spoken part runs 15 % faster than its base rate; the relative pacing (slower repeated word) stays.
const SPEED_UP = 1.15;
export type SpeechPart = { text: string; pitch?: number; rate?: number; pause?: number };
let speechGeneration = 0;
export function stopSpeaking() {
  speechGeneration++;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel();
}
// A cancelled sequence can never restart from a late onend event.
export function speakSequence(parts: SpeechPart[], prefs: VoicePrefs, onFinish?: () => void) {
  stopSpeaking();
  const generation = speechGeneration;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onFinish?.(); return () => {}; }
  const voice = pickVoice(prefs);
  let index = 0;
  const next = () => {
    if (generation !== speechGeneration) return;
    const part = parts[index++];
    if (!part) { onFinish?.(); return; }
    const utterance = new SpeechSynthesisUtterance(part.text.replace(/…|\.{3}/g, '').replace(/[{}]/g, ''));
    utterance.voice = voice; utterance.lang = voice?.lang || 'de-DE';
    utterance.rate = (part.rate ?? SPEECH_RATE) * SPEED_UP; utterance.pitch = part.pitch ?? prefs.pitch;
    utterance.onend = () => { if (part.pause) setTimeout(next, part.pause); else next(); };
    utterance.onerror = () => { if (generation === speechGeneration) { speechGeneration++; onFinish?.(); } };
    speechSynthesis.speak(utterance);
  };
  next();
  return () => { if (generation === speechGeneration) stopSpeaking(); };
}
export function speak(text: string, prefs: VoicePrefs = { voice: '', pitch: 1 }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return false;
  speakSequence([{ text }], prefs); return true;
}
// Dictation as in class: the word, the sentence, then the word once more.
export function dictate(word: { text: string; sentence?: string }, prefs: VoicePrefs, withSentence = true) {
  const sentence = word.sentence?.replace(/[{}]/g, '');
  return speakSequence([{ text: word.text, pause: 350 }, ...(withSentence && sentence ? [{ text: sentence, pause: 350 }, { text: word.text, rate: .7 }] : [])], prefs);
}
