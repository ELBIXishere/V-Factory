/**
 * CCTV Alert Effect GLSL Shader
 * 사고 발생 시 CCTV 피드에 적용되는 시각 효과
 * - Red Overlay: 붉은 색조 오버레이
 * - Glitch Effect: UV 왜곡으로 인한 화면 떨림
 * - Scanline Effect: CRT 스캔라인 효과
 */

// Vertex Shader
// =====================================
#ifdef VERTEX_SHADER
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
#endif

// Fragment Shader
// =====================================
#ifdef FRAGMENT_SHADER
uniform sampler2D tDiffuse;     // 입력 텍스처
uniform float time;              // 애니메이션 시간
uniform float intensity;         // 이펙트 강도 (0.0 - 1.0)
uniform bool enableGlitch;       // Glitch 효과 활성화
uniform bool enableScanlines;    // 스캔라인 효과 활성화
uniform bool enableRedOverlay;   // 붉은 오버레이 활성화

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
    float band = sin(uv.y * 10.0 + t * 2.0) * 0.1 + 0.9;
    
    return (1.0 - staticScanline) * (1.0 - movingScanline) * band;
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
#endif
