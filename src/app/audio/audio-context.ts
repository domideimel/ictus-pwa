/** Safari 17+: tells iOS how the page uses audio, so the click plays even with the ring/silent switch on. */
interface AudioSessionNavigator {
  audioSession?: { type: 'auto' | 'playback' | 'play-and-record' | 'ambient' };
}

let context: AudioContext | null = null;

/** One context for the click and the microphone; browsers limit how many may exist. */
export function sharedAudioContext(): AudioContext {
  context ??= new AudioContext({ latencyHint: 'interactive' });
  return context;
}

export function setAudioSession(type: 'playback' | 'play-and-record'): void {
  const session = (navigator as Navigator & AudioSessionNavigator).audioSession;
  if (session) session.type = type;
}
