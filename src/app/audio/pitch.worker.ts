/// <reference lib="webworker" />

import { PitchDetector, PitchRequest } from './pitch-detector';

let detector: PitchDetector | null = null;

addEventListener('message', ({ data }: MessageEvent<PitchRequest>) => {
  if (detector?.sampleRate !== data.sampleRate) detector = new PitchDetector(data.sampleRate);
  postMessage(detector.frequency(data.samples));
});
