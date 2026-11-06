import { FakeAudioContext } from '../../testing/fakes';
import { setAudioSession, sharedAudioContext } from './audio-context';

describe('audio context', () => {
  afterEach(() => {
    delete (navigator as { audioSession?: unknown }).audioSession;
  });

  it('creates one shared context', () => {
    const context = sharedAudioContext();
    expect(context).toBeInstanceOf(FakeAudioContext);
    expect(sharedAudioContext()).toBe(context);
  });

  it('sets the iOS audio session type where supported', () => {
    const session = { type: 'auto' };
    Object.defineProperty(navigator, 'audioSession', { configurable: true, value: session });
    setAudioSession('play-and-record');
    expect(session.type).toBe('play-and-record');
    setAudioSession('playback');
    expect(session.type).toBe('playback');
  });

  it('does nothing in browsers without an audio session', () => {
    expect(() => setAudioSession('playback')).not.toThrow();
  });
});
