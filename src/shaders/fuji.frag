#version 300 es
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
        value += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return value;
}

void main() {
    vec2 fragCoord = vUv * uResolution;
    float iTime = uTime;
    vec2 iResolution = uResolution;

    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // animation times
    float t = iTime * 0.8; 
    float t_sun = clamp((t - 0.5) / 1.5, 0.0, 1.0); 
    float t_mnt = clamp((t - 0.8) / 2.0, 0.0, 1.0); 
    
    vec3 rgb = vec3(0.0);
    float alpha = 0.0;
    float wetEdgeJitter = fbm(uv * 40.0) * 0.08;

    // THE RED SUN 
    vec2 sunUV = uv - vec2(0.6, 0.3); 
    float sunRadius = 0.18; // slightly larger
    float sunDist = length(sunUV) - sunRadius + fbm(uv * 10.0) * 0.04; // softer, less intense noise displacement
    float sunShape = smoothstep(0.05, -0.05, sunDist); // much softer edges
    float sunReveal = smoothstep(0.02, -0.02, (sunUV.x + sunUV.y) - (t_sun * 0.6 - 0.3) + wetEdgeJitter);
    
    // less internal contrast, looks more like a flat watercolor wash
    sunShape *= (fbm(uv * 20.0) * 0.3 + 0.7) * sunReveal;
    float a_sun = clamp(sunShape * 0.6, 0.0, 1.0); // lower opacity overall
    rgb = mix(rgb, vec3(0.9, 0.15, 0.15), a_sun); // slightly softer red
    alpha = max(alpha, a_sun);

    // MOUNTAIN
    vec2 mntUV = uv;
    mntUV.x += fbm(uv * 10.0) * 0.05;
    mntUV.y += fbm(uv * 15.0) * 0.03;
    
    float fujiX = mntUV.x + 0.05; 
    float mountainShape = -0.1 - pow(abs(fujiX), 0.8) * 0.6; 
    float mountainMask = smoothstep(0.0, 0.02, mountainShape - mntUV.y);
    float mntReveal = smoothstep(0.05, -0.05, (mntUV.x + mntUV.y) - (t_mnt * 2.0 - 1.0) + wetEdgeJitter);
    
    float outlineDist = abs(mountainShape - mntUV.y);
    float mntOutline = smoothstep(0.01, 0.002, outlineDist) * smoothstep(0.0, 0.05, mntUV.y + 0.15);
    float ridgeTexture = fbm(vec2(mntUV.x * 25.0, mntUV.y * 5.0)); 
    float lightSide = smoothstep(-0.15, 0.25, fujiX + ridgeTexture * 0.1);
    
    vec3 deepBlackInk = vec3(0.04, 0.04, 0.05);
    vec3 grayWaterWash = vec3(0.6, 0.6, 0.65);
    vec3 baseMntColor = mix(deepBlackInk, grayWaterWash, lightSide);
    baseMntColor *= (0.6 + 0.4 * fbm(uv * 40.0)); 

    float snowLine = -0.22 + abs(fujiX) * 0.5 + (fbm(uv * 30.0) * 0.04);
    float snowCap = smoothstep(snowLine - 0.01, snowLine + 0.01, mntUV.y);
    vec3 mountainColor = mix(baseMntColor, vec3(0.98, 0.99, 1.0), snowCap);
    mountainColor = mix(mountainColor, vec3(0.02), mntOutline); 

    float a_mnt = mountainMask * mntReveal;
    
    // Grayscale with a slight cool/blue tint to match background universe
    vec3 mntColorDesat = vec3(dot(mountainColor, vec3(0.333)));
    mntColorDesat *= vec3(0.85, 0.9, 0.95); 
    
    rgb = mix(rgb, mntColorDesat, a_mnt);
    alpha = max(alpha, a_mnt * 0.8); // Softer mountain opacity

    // Output transparent colors for overlapping
    fragColor = vec4(rgb, alpha);
}
