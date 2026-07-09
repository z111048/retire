import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile } from 'remotion';
import { HANDWRITING_FONT } from '../utils/fonts';
import { HERSELF_AVATAR_INDICES } from '../utils/herselfAvatars';
import { FINALE_WALL_CONFIG } from '../utils/finaleWallConfig';
import { computeWallLayout, computeRequiredPullBackDistance } from '../utils/finaleWallLayout';
import { computeCameraFrame } from '../utils/finaleCameraPath';

interface FinaleAvatarWallSceneProps {
  avatarCount: number;
  caption: string;
}

declare global {
  interface Window {
    __REMOTION_BASE__?: string;
  }
}

function avatarSrc(idx: number): string {
  const file = `qavatars/${String(idx).padStart(4, '0')}.jpg`;
  if (typeof window !== 'undefined' && window.__REMOTION_BASE__) {
    return window.__REMOTION_BASE__ + file;
  }
  return staticFile(file);
}

// 想讓哪些照片編號排進最靠近攝影機起點、最早被看清楚的深度層（對應舊版跑馬燈
// FEATURED「提前到第幾張」的設計意圖，3D 牆裡改成「排進最前面的深度層」，
// 語意相同，實作方式因應新的空間排列邏輯而調整——見 finaleWallLayout.ts）。
const FEATURED_AVATAR_INDICES: number[] = [371];

/**
 * 片尾彩蛋：580+ 張 Q 版頭像組成一片有深度層次的照片牆，攝影機從遠處緩緩飛越
 * 穿梭其中，最後平順拉遠，完整呈現整片牆並淡入退休祝福文字。
 *
 * 取代舊版單一平面由下往上捲動的跑馬燈（那個版本在固定捲動速度下，18 秒內
 * 只能捲到約 62% 的照片——已在對話中實測驗證；這個版本改成「拉遠時整片牆
 * 一定完整入鏡」，不會有捲不到的問題，是結構性的解法而不是調參數）。
 *
 * 實作全部使用 Remotion／CSS 原生 3D（perspective + translate3d），沒有引入
 * Three.js/WebGL——理由：現有專案零 WebGL 依賴，580 張頭像在 CSS 3D
 * 合成層下已經是效能可控的量級（跟 HeartCollageScene 同量級頭像數已驗證可行），
 * 額外引入 WebGL context 反而增加 headless render 的不穩定風險與維護成本，
 * 不符合「維持現有架構與可維護性優先」的前提。
 *
 * 所有可調參數集中在 utils/finaleWallConfig.ts；版面／深度計算在
 * utils/finaleWallLayout.ts；攝影機時間軸在 utils/finaleCameraPath.ts。
 * 這個檔案只負責把三者組起來渲染，不應該再新增寫死的數值常數。
 */
export const FinaleAvatarWallScene: React.FC<FinaleAvatarWallSceneProps> = ({ avatarCount, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height, fps } = useVideoConfig();

  // 版面（每張照片的 x/y/z/傾斜/飄浮參數）只跟 avatarCount 有關，不隨影格變化
  const { tiles, bounds } = React.useMemo(
    () => computeWallLayout(avatarCount, FEATURED_AVATAR_INDICES),
    [avatarCount]
  );

  // 拉遠距離依牆的實際尺寸反推，版面參數改了不用手動重新試這個數字
  const pullBackDistance = React.useMemo(
    () => computeRequiredPullBackDistance(bounds, FINALE_WALL_CONFIG.camera.perspectivePx, width, height),
    [bounds, width, height]
  );

  // 場景整體淡入淡出，跟其他場景一致的手法
  const fadeOutStart = durationInFrames - 20;
  const containerOpacity = interpolate(frame, [0, 15, fadeOutStart, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 攝影機／拉遠／字幕的進度要在「淡出開始前」就走完並停住（HOLD_FRAMES 那段
  // 時間），不能跟 fadeOutStart 同時抵達終點——不然整片牆完整入鏡、字幕淡入
  // 的那個瞬間，畫面同時也在往黑幕淡出，等於最重要的畫面被自己蓋掉看不清楚。
  const HOLD_FRAMES = 30; // 拉遠完成後，定格讓觀眾看清楚整片牆與字幕的時間
  const cameraActiveFrames = Math.max(1, fadeOutStart - HOLD_FRAMES);
  const progress = Math.min(1, frame / cameraActiveFrames);
  const timeSeconds = frame / fps;
  const cam = computeCameraFrame(progress, timeSeconds, pullBackDistance);

  const { perspectivePx } = FINALE_WALL_CONFIG.camera;
  const { tileSizePx } = FINALE_WALL_CONFIG.layout;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        opacity: containerOpacity,
        background: '#1c1712',
        // perspective 定義在容器上，裡面的 3D 世界（下面那層 preserve-3d）才會有透視效果
        perspective: perspectivePx,
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* 3D 世界：這一層的 transform 就是「攝影機」——移動/旋轉整個世界來模擬鏡頭
          飛越，比逐一移動580張照片便宜很多（每幀只需更新這一個 transform）。 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: `translate3d(${cam.driftX}px, ${cam.driftY}px, ${-cam.distance}px) rotateY(${cam.yawDeg}deg)`,
        }}
      >
        {tiles.map((tile) => {
          const isHerself = HERSELF_AVATAR_INDICES.has(tile.avatarIdx);
          // 飄浮動畫：每張照片各自的週期＋相位，極輕微的上下位移，避免整片同步
          // 浮動看起來像水波紋特效；純三角函數運算，580張的成本可忽略不計。
          const floatY =
            Math.sin((timeSeconds / tile.floatPeriodS) * Math.PI * 2 + tile.floatPhase) * tile.floatAmplitudePx;

          return (
            <div
              key={tile.avatarIdx}
              style={{
                position: 'absolute',
                left: width / 2 + tile.x - tileSizePx / 2,
                top: height / 2 + tile.y + floatY - tileSizePx / 2,
                width: tileSizePx,
                height: tileSizePx,
                transform: `translateZ(${tile.z}px) rotateZ(${tile.tiltDeg}deg) rotateY(${tile.yawDeg}deg)`,
                borderRadius: 6,
                overflow: 'hidden',
                // 跟舊版同樣理由：580張各自套 boxShadow 會逐一觸發 GPU 合成層，
                // 只有秀燕姐本人（少數，見 HERSELF_AVATAR_INDICES）才用金框特別標出——
                // 不是排除她，是「她也在人群中」的畫面，同時間只有幾張不影響效能。
                border: isHerself ? '3px solid #FFD24C' : '1px solid rgba(0,0,0,0.25)',
                boxShadow: isHerself ? '0 0 8px rgba(255, 210, 76, 0.7)' : 'none',
                backfaceVisibility: 'hidden',
              }}
            >
              <Img src={avatarSrc(tile.avatarIdx)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>

      {/* 祝福文字：刻意不放進上面的 3D 世界，不受透視/攝影機影響，維持清晰置中，
          只在最後拉遠階段淡入（見 finaleCameraPath 的 captionOpacity 時間軸）。 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: cam.captionOpacity,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: HANDWRITING_FONT,
            fontSize: 64,
            fontWeight: 400,
            color: '#F5E6C8',
            letterSpacing: '0.2em',
            textAlign: 'center',
            textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.6)',
          }}
        >
          {caption}
        </span>
      </div>
    </div>
  );
};
