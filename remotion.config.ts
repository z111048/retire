import { Config } from '@remotion/cli/config';

Config.setEntryPoint('./src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
// 影片場景抽幀期間字型載入可能超過預設 28s，放寬避免 delayRender timeout
Config.setTimeoutInMilliseconds(120000);
