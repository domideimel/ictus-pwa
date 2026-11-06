import type { FakeAudioContext } from '../../testing/fakes';
import { FakeWorker, fakeStream, stubGetUserMedia } from '../../testing/fakes';
import { sharedAudioContext } from './audio-context';
import { Microphone } from './microphone';
import type { PitchRequest } from './pitch-detector';

describe('Microphone', () => {
  let pitches: (number | null)[];
  let microphone: Microphone;
  let stream: ReturnType<typeof fakeStream>;
  let constraints: MediaStreamConstraints | undefined;

  const worker = (): FakeWorker => FakeWorker.instances.at(-1)!;

  beforeEach(() => {
    vi.useFakeTimers();
    pitches = [];
    stream = fakeStream();
    constraints = undefined;
    stubGetUserMedia((...args: unknown[]) => {
      constraints = args[0] as MediaStreamConstraints;
      return Promise.resolve(stream);
    });
    (sharedAudioContext() as unknown as FakeAudioContext).state = 'suspended';
    microphone = new Microphone((pitch) => pitches.push(pitch));
  });

  afterEach(() => {
    microphone.dispose();
    vi.useRealTimers();
  });

  it('asks for raw audio without processing that bends the pitch', async () => {
    await microphone.start();
    expect(constraints).toEqual({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    expect((sharedAudioContext() as unknown as FakeAudioContext).state).toBe('running');
  });

  it('sends a 4096-sample window to the worker every hop and reports its answer', async () => {
    await microphone.start();
    vi.advanceTimersByTime(43);
    expect(worker().messages).toHaveLength(1);
    const request = worker().messages[0] as PitchRequest;
    expect(request.sampleRate).toBe(48_000);
    expect(request.samples).toHaveLength(4096);

    worker().reply(220);
    worker().reply(null);
    expect(pitches).toEqual([220, null]);
  });

  it('skips hops while the worker is still busy', async () => {
    await microphone.start();
    vi.advanceTimersByTime(43 * 3);
    expect(worker().messages).toHaveLength(1);
    worker().reply(110);
    vi.advanceTimersByTime(43);
    expect(worker().messages).toHaveLength(2);
  });

  it('releases the microphone on stop and ignores late answers', async () => {
    await microphone.start();
    vi.advanceTimersByTime(43);
    microphone.stop();
    expect(stream.stoppedTracks).toBe(1);
    worker().reply(440);
    vi.advanceTimersByTime(500);
    expect(pitches).toEqual([]);
    expect(worker().messages).toHaveLength(1);
  });

  it('starts only once', async () => {
    await microphone.start();
    await microphone.start();
    vi.advanceTimersByTime(43);
    expect(worker().messages).toHaveLength(1);
  });

  it('passes on a denied permission', async () => {
    stubGetUserMedia(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    await expect(microphone.start()).rejects.toThrow('denied');
  });

  it('terminates the worker on dispose', async () => {
    await microphone.start();
    const current = worker();
    microphone.dispose();
    expect(current.terminated).toBe(true);
  });
});
