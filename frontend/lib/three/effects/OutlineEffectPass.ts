/**
 * Outline Effect Pass
 * 부상 NPC 하이라이트를 위한 외곽선 렌더링
 * - Sobel Filter 기반 외곽선 추출
 * - Pulse Animation (크기 진동 효과)
 * - 색상 커스터마이징
 */

import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

/**
 * Outline Effect 셰이더 머티리얼
 */
const OutlineEffectShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    tNormal: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    outlineColor: { value: new THREE.Color(0xff0000) },
    outlineThickness: { value: 1.0 },
    outlineIntensity: { value: 1.0 },
    time: { value: 0.0 },
    pulseSpeed: { value: 3.0 },
    pulseIntensity: { value: 0.3 },
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
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform vec3 outlineColor;
    uniform float outlineThickness;
    uniform float outlineIntensity;
    uniform float time;
    uniform float pulseSpeed;
    uniform float pulseIntensity;

    varying vec2 vUv;

    // Sobel 커널 (수평)
    const mat3 Gx = mat3(
      -1.0, 0.0, 1.0,
      -2.0, 0.0, 2.0,
      -1.0, 0.0, 1.0
    );

    // Sobel 커널 (수직)
    const mat3 Gy = mat3(
      -1.0, -2.0, -1.0,
       0.0,  0.0,  0.0,
       1.0,  2.0,  1.0
    );

    // 깊이값에서 외곽선 추출
    float getEdge(sampler2D tex, vec2 uv, vec2 texelSize) {
      float gx = 0.0;
      float gy = 0.0;

      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 offset = vec2(float(i), float(j)) * texelSize * outlineThickness;
          float depth = texture2D(tex, uv + offset).r;
          
          gx += depth * Gx[i + 1][j + 1];
          gy += depth * Gy[i + 1][j + 1];
        }
      }

      return sqrt(gx * gx + gy * gy);
    }

    // 색상 기반 외곽선 추출 (밝기 변화 감지)
    float getColorEdge(sampler2D tex, vec2 uv, vec2 texelSize) {
      float gx = 0.0;
      float gy = 0.0;

      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 offset = vec2(float(i), float(j)) * texelSize * outlineThickness;
          vec3 color = texture2D(tex, uv + offset).rgb;
          float luma = dot(color, vec3(0.299, 0.587, 0.114));
          
          gx += luma * Gx[i + 1][j + 1];
          gy += luma * Gy[i + 1][j + 1];
        }
      }

      return sqrt(gx * gx + gy * gy);
    }

    void main() {
      vec2 texelSize = 1.0 / resolution;
      
      // 원본 색상
      vec4 color = texture2D(tDiffuse, vUv);
      
      // 외곽선 강도 계산 (깊이 + 색상 기반)
      float depthEdge = 0.0;
      float colorEdge = getColorEdge(tDiffuse, vUv, texelSize);
      
      // 깊이 버퍼가 있으면 깊이 기반 외곽선도 계산
      #ifdef USE_DEPTH
        depthEdge = getEdge(tDepth, vUv, texelSize);
      #endif
      
      // 최종 외곽선 강도
      float edge = max(depthEdge, colorEdge) * outlineIntensity;
      
      // 펄스 효과 (시간에 따른 밝기 변동)
      float pulse = 1.0 + sin(time * pulseSpeed) * pulseIntensity;
      edge *= pulse;
      
      // 외곽선 임계값 적용
      edge = smoothstep(0.1, 0.5, edge);
      
      // 외곽선 색상 혼합
      vec3 finalColor = mix(color.rgb, outlineColor * pulse, edge);
      
      gl_FragColor = vec4(finalColor, color.a);
    }
  `,
};

/**
 * Outline Effect 설정 옵션
 */
export interface OutlineEffectOptions {
  // 외곽선 색상
  outlineColor?: THREE.Color | number;
  // 외곽선 두께
  outlineThickness?: number;
  // 외곽선 강도
  outlineIntensity?: number;
  // 펄스 속도
  pulseSpeed?: number;
  // 펄스 강도
  pulseIntensity?: number;
}

/**
 * Outline Effect Pass 클래스
 * Three.js EffectComposer와 함께 사용
 */
export class OutlineEffectPass extends Pass {
  // 셰이더 유니폼
  private uniforms: {
    tDiffuse: { value: THREE.Texture | null };
    tDepth: { value: THREE.Texture | null };
    resolution: { value: THREE.Vector2 };
    outlineColor: { value: THREE.Color };
    outlineThickness: { value: number };
    outlineIntensity: { value: number };
    time: { value: number };
    pulseSpeed: { value: number };
    pulseIntensity: { value: number };
  };

  // 셰이더 머티리얼
  private material: THREE.ShaderMaterial;

  // 전체 화면 쿼드
  private fsQuad: FullScreenQuad;

  // 활성화 상태
  private _enabled: boolean = false;

  // 해상도
  private resolution: THREE.Vector2;

  constructor(
    resolution: THREE.Vector2 = new THREE.Vector2(512, 512),
    options: OutlineEffectOptions = {}
  ) {
    super();

    this.resolution = resolution;

    // 기본값 설정
    const {
      outlineColor = 0xff0000,
      outlineThickness = 1.5,
      outlineIntensity = 1.0,
      pulseSpeed = 3.0,
      pulseIntensity = 0.3,
    } = options;

    // 유니폼 초기화
    this.uniforms = {
      tDiffuse: { value: null },
      tDepth: { value: null },
      resolution: { value: resolution.clone() },
      outlineColor: {
        value:
          outlineColor instanceof THREE.Color
            ? outlineColor
            : new THREE.Color(outlineColor),
      },
      outlineThickness: { value: outlineThickness },
      outlineIntensity: { value: outlineIntensity },
      time: { value: 0.0 },
      pulseSpeed: { value: pulseSpeed },
      pulseIntensity: { value: pulseIntensity },
    };

    // 셰이더 머티리얼 생성
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: OutlineEffectShader.vertexShader,
      fragmentShader: OutlineEffectShader.fragmentShader,
    });

    // 전체 화면 쿼드 생성
    this.fsQuad = new FullScreenQuad(this.material);
  }

  /**
   * 해상도 설정
   */
  setSize(width: number, height: number): void {
    this.resolution.set(width, height);
    this.uniforms.resolution.value.set(width, height);
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
        const copyMaterial = new THREE.MeshBasicMaterial({
          map: readBuffer.texture,
        });
        this.fsQuad.material = copyMaterial;
        this.fsQuad.render(renderer);
        copyMaterial.dispose();
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
   * 외곽선 색상 설정
   */
  setOutlineColor(color: THREE.Color | number): void {
    if (color instanceof THREE.Color) {
      this.uniforms.outlineColor.value.copy(color);
    } else {
      this.uniforms.outlineColor.value.setHex(color);
    }
  }

  /**
   * 외곽선 두께 설정
   */
  setOutlineThickness(thickness: number): void {
    this.uniforms.outlineThickness.value = Math.max(0.1, thickness);
  }

  /**
   * 외곽선 강도 설정
   */
  setOutlineIntensity(intensity: number): void {
    this.uniforms.outlineIntensity.value = Math.max(0, Math.min(2, intensity));
  }

  /**
   * 펄스 속도 설정
   */
  setPulseSpeed(speed: number): void {
    this.uniforms.pulseSpeed.value = Math.max(0, speed);
  }

  /**
   * 펄스 강도 설정
   */
  setPulseIntensity(intensity: number): void {
    this.uniforms.pulseIntensity.value = Math.max(0, Math.min(1, intensity));
  }

  /**
   * 전체 옵션 업데이트
   */
  updateOptions(options: Partial<OutlineEffectOptions>): void {
    if (options.outlineColor !== undefined) {
      this.setOutlineColor(options.outlineColor);
    }
    if (options.outlineThickness !== undefined) {
      this.setOutlineThickness(options.outlineThickness);
    }
    if (options.outlineIntensity !== undefined) {
      this.setOutlineIntensity(options.outlineIntensity);
    }
    if (options.pulseSpeed !== undefined) {
      this.setPulseSpeed(options.pulseSpeed);
    }
    if (options.pulseIntensity !== undefined) {
      this.setPulseIntensity(options.pulseIntensity);
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

export default OutlineEffectPass;
