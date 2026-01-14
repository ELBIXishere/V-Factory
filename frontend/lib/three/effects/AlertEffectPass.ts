/**
 * Alert Effect Pass
 * CCTV 사고 경고 시각 효과를 위한 Three.js 후처리 패스
 * - Red Overlay: 붉은 색조 오버레이
 * - Glitch Effect: UV 왜곡
 * - Scanline Effect: CRT 스캔라인
 */

import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

/**
 * Alert Effect 셰이더 머티리얼
 */
const AlertEffectShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    intensity: { value: 1.0 },
    enableGlitch: { value: true },
    enableScanlines: { value: true },
    enableRedOverlay: { value: true },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform bool enableGlitch;
    uniform bool enableScanlines;
    uniform bool enableRedOverlay;

    varying vec2 vUv;

    // 랜덤 함수 (노이즈 생성용)
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // Glitch 효과 - UV 왜곡
    vec2 glitchUV(vec2 uv, float t, float strength) {
      // 수평 왜곡
      float glitchStrength = sin(t * 10.0 + uv.y * 50.0) * 0.01 * strength;
      
      // 랜덤 수직 밴드 왜곡
      float band = step(0.95, random(vec2(floor(t * 5.0), floor(uv.y * 10.0))));
      glitchStrength += band * 0.03 * strength;
      
      // 간헐적 큰 왜곡
      float bigGlitch = step(0.98, random(vec2(floor(t * 2.0), 0.0)));
      glitchStrength += bigGlitch * sin(uv.y * 100.0 + t * 50.0) * 0.05 * strength;
      
      return vec2(uv.x + glitchStrength, uv.y);
    }

    // 스캔라인 효과
    float scanline(vec2 uv, float t) {
      // 정적 스캔라인
      float staticScanline = sin(uv.y * 400.0) * 0.04;
      
      // 움직이는 스캔라인
      float movingScanline = sin(uv.y * 100.0 - t * 10.0) * 0.02;
      
      // 밝기 변화 밴드
      float bandEffect = sin(uv.y * 10.0 + t * 2.0) * 0.1 + 0.9;
      
      return (1.0 - staticScanline) * (1.0 - movingScanline) * bandEffect;
    }

    // 색수차 효과 (RGB 분리)
    vec3 chromaticAberration(sampler2D tex, vec2 uv, float strength) {
      float r = texture2D(tex, uv + vec2(strength * 0.003, 0.0)).r;
      float g = texture2D(tex, uv).g;
      float b = texture2D(tex, uv - vec2(strength * 0.003, 0.0)).b;
      return vec3(r, g, b);
    }

    // 비네트 효과 (모서리 어두워짐)
    float vignette(vec2 uv, float strength) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      return 1.0 - smoothstep(0.3, 0.7, dist * strength);
    }

    void main() {
      vec2 uv = vUv;
      
      // Glitch 효과 적용
      if (enableGlitch) {
        uv = glitchUV(uv, time, intensity);
      }
      
      // 색수차 효과가 적용된 기본 색상
      vec3 color;
      if (enableGlitch) {
        color = chromaticAberration(tDiffuse, uv, intensity);
      } else {
        color = texture2D(tDiffuse, uv).rgb;
      }
      
      // 스캔라인 효과 적용
      if (enableScanlines) {
        color *= scanline(vUv, time);
      }
      
      // Red Overlay 효과 적용
      if (enableRedOverlay) {
        // 붉은 색조 추가 (가산 블렌딩)
        vec3 redOverlay = vec3(0.3, 0.0, 0.0) * intensity;
        color += redOverlay;
        
        // 붉은 비네트 효과
        float vig = vignette(vUv, 1.5);
        color = mix(color, color * vec3(1.0, 0.7, 0.7), (1.0 - vig) * intensity * 0.5);
      }
      
      // 노이즈 오버레이
      if (enableGlitch) {
        float noise = random(vUv + time) * 0.05 * intensity;
        color += noise;
      }
      
      // 펄스 효과 (밝기 변동)
      float pulse = sin(time * 5.0) * 0.1 * intensity + 1.0;
      color *= pulse;
      
      // 최종 출력
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

/**
 * Alert Effect 설정 옵션
 */
export interface AlertEffectOptions {
  // 이펙트 강도 (0.0 - 1.0)
  intensity?: number;
  // Glitch 효과 활성화
  enableGlitch?: boolean;
  // 스캔라인 효과 활성화
  enableScanlines?: boolean;
  // 붉은 오버레이 활성화
  enableRedOverlay?: boolean;
}

/**
 * Alert Effect Pass 클래스
 * Three.js EffectComposer와 함께 사용
 */
export class AlertEffectPass extends Pass {
  // 셰이더 유니폼
  private uniforms: {
    tDiffuse: { value: THREE.Texture | null };
    time: { value: number };
    intensity: { value: number };
    enableGlitch: { value: boolean };
    enableScanlines: { value: boolean };
    enableRedOverlay: { value: boolean };
  };

  // 셰이더 머티리얼
  private material: THREE.ShaderMaterial;

  // 전체 화면 쿼드
  private fsQuad: FullScreenQuad;

  // 활성화 상태
  private _enabled: boolean = false;

  constructor(options: AlertEffectOptions = {}) {
    super();

    // 기본값 설정
    const {
      intensity = 1.0,
      enableGlitch = true,
      enableScanlines = true,
      enableRedOverlay = true,
    } = options;

    // 유니폼 초기화
    this.uniforms = {
      tDiffuse: { value: null },
      time: { value: 0.0 },
      intensity: { value: intensity },
      enableGlitch: { value: enableGlitch },
      enableScanlines: { value: enableScanlines },
      enableRedOverlay: { value: enableRedOverlay },
    };

    // 셰이더 머티리얼 생성
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: AlertEffectShader.vertexShader,
      fragmentShader: AlertEffectShader.fragmentShader,
    });

    // 전체 화면 쿼드 생성
    this.fsQuad = new FullScreenQuad(this.material);
  }

  /**
   * 렌더링 실행
   */
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number
  ): void {
    // 비활성화 상태면 입력을 그대로 출력
    if (!this._enabled) {
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
        this.fsQuad.material = new THREE.MeshBasicMaterial({
          map: readBuffer.texture,
        });
        this.fsQuad.render(renderer);
      }
      return;
    }

    // 시간 업데이트
    this.uniforms.time.value += deltaTime;

    // 입력 텍스처 설정
    this.uniforms.tDiffuse.value = readBuffer.texture;

    // 렌더링
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }

    this.fsQuad.material = this.material;
    this.fsQuad.render(renderer);
  }

  /**
   * 이펙트 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * 이펙트 활성화 상태 조회
   */
  get isEffectEnabled(): boolean {
    return this._enabled;
  }

  /**
   * 이펙트 강도 설정
   */
  setIntensity(intensity: number): void {
    this.uniforms.intensity.value = Math.max(0, Math.min(1, intensity));
  }

  /**
   * 이펙트 강도 조회
   */
  get intensity(): number {
    return this.uniforms.intensity.value;
  }

  /**
   * Glitch 효과 활성화/비활성화
   */
  setGlitchEnabled(enabled: boolean): void {
    this.uniforms.enableGlitch.value = enabled;
  }

  /**
   * 스캔라인 효과 활성화/비활성화
   */
  setScanlinesEnabled(enabled: boolean): void {
    this.uniforms.enableScanlines.value = enabled;
  }

  /**
   * Red Overlay 효과 활성화/비활성화
   */
  setRedOverlayEnabled(enabled: boolean): void {
    this.uniforms.enableRedOverlay.value = enabled;
  }

  /**
   * 전체 옵션 업데이트
   */
  updateOptions(options: Partial<AlertEffectOptions>): void {
    if (options.intensity !== undefined) {
      this.setIntensity(options.intensity);
    }
    if (options.enableGlitch !== undefined) {
      this.setGlitchEnabled(options.enableGlitch);
    }
    if (options.enableScanlines !== undefined) {
      this.setScanlinesEnabled(options.enableScanlines);
    }
    if (options.enableRedOverlay !== undefined) {
      this.setRedOverlayEnabled(options.enableRedOverlay);
    }
  }

  /**
   * 시간 리셋
   */
  resetTime(): void {
    this.uniforms.time.value = 0;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

export default AlertEffectPass;
