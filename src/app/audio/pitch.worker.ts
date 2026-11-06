/// <reference lib="webworker" />

import type { PitchRequest } from './pitch-detector';
import { PitchDetector } from './pitch-detector';

let detector: PitchDetector | null = null;

addEventListener('message', ({ data }: MessageEvent<PitchRequest>) => {
  if (detector?.sampleRate !== data.sampleRate) detector = new PitchDetector(data.sampleRate);
  postMessage(detector.frequency(data.samples));
});
