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

// Composite a layer over the accumulated (premultiplied) colour
void over(inout vec3 acc, inout float accA, vec3 col, float a) {
    acc = col * a + acc * (1.0 - a);
    accA = a + accA * (1.0 - a);
}

const vec2 SUN = vec2(0.6, 0.3);
const vec3 SUN_COL = vec3(0.9, 0.16, 0.14);

void main() {
    vec2 fragCoord = vUv * uResolution;
    vec2 uv = (fragCoord - 0.5 * uResolution.xy) / uResolution.y;

    // Reveal timeline (one-off), then a clock that keeps running for the mist
    float t = uTime * 0.8;
    float t_sun = clamp((t - 0.5) / 1.5, 0.0, 1.0);
    float t_mnt = clamp((t - 0.8) / 2.0, 0.0, 1.0);
    float t_mist = clamp((t - 2.4) / 2.5, 0.0, 1.0);
    float drift = uTime;

    vec3 acc = vec3(0.0);
    float accA = 0.0;
    float wetEdgeJitter = fbm(uv * 40.0) * 0.08;

    // SKY GLOW: the sun lights the air around it, breathing very slowly
    vec2 sunUV = uv - SUN;
    float glow = exp(-max(length(sunUV) - 0.16, 0.0) * 5.5);
    glow *= (0.07 + 0.012 * sin(drift * 0.5)) * t_sun;
    over(acc, accA, SUN_COL * 0.7, glow);

    // THE SUN: a soft watercolour disc
    float sunDist = length(sunUV) - 0.18 + fbm(uv * 10.0) * 0.04;
    float sunShape = smoothstep(0.05, -0.05, sunDist);
    float sunReveal = smoothstep(0.02, -0.02, (sunUV.x + sunUV.y) - (t_sun * 0.6 - 0.3) + wetEdgeJitter);
    sunShape *= (fbm(uv * 20.0) * 0.3 + 0.7) * sunReveal;
    over(acc, accA, SUN_COL, clamp(sunShape * 0.66, 0.0, 1.0));

    // MOUNTAIN: Fuji's profile, a flat notched crater rim over concave slopes
    vec2 m = uv;
    m.x += fbm(uv * 10.0) * 0.05;
    m.y += fbm(uv * 15.0) * 0.03;
    float fx = m.x + 0.05;
    const float CRATER = 0.04;
    float ax = max(abs(fx) - CRATER, 0.0);
    float ridgeY = -0.115 - pow(ax, 0.8) * 0.62;
    ridgeY -= (1.0 - step(CRATER, abs(fx))) * fbm(vec2(fx * 70.0, 3.0)) * 0.014;

    float inside = smoothstep(0.0, 0.012, ridgeY - m.y);
    float mntReveal = smoothstep(0.05, -0.05, (m.x + m.y) - (t_mnt * 2.0 - 1.0) + wetEdgeJitter);

    // Lit from the sun's side (right). Shading follows which way the cone's
    // surface faces (offset over depth below the summit), so the terminator
    // fans out from the crater along the gullies instead of running straight down
    float gullies = fbm(vec2(fx * 26.0, m.y * 5.0));
    float facing = fx / max(0.05, -0.1 - m.y);
    float lit = smoothstep(-0.55, 0.85, facing + (gullies - 0.5) * 0.7);

    vec3 rockShadow = vec3(0.07, 0.075, 0.09);
    vec3 rockLit = vec3(0.52, 0.49, 0.48);
    vec3 rock = mix(rockShadow, rockLit, lit) * (0.65 + 0.35 * fbm(uv * 40.0));

    // Snow takes the same light: warm where the sun reaches, cool blue in shadow
    float snowLine = -0.23 + abs(fx) * 0.5 + fbm(uv * 30.0) * 0.04;
    float snow = smoothstep(snowLine - 0.01, snowLine + 0.01, m.y);
    vec3 snowShadow = vec3(0.36, 0.39, 0.47);
    vec3 snowLit = vec3(0.93, 0.86, 0.82);
    vec3 snowCol = mix(snowShadow, snowLit, lit) * (0.86 + 0.14 * fbm(uv * 30.0));
    vec3 mountainColor = mix(rock, snowCol, snow);

    // A thin warm rim where the sunlit ridge meets the sky
    float rim = smoothstep(0.018, 0.0, ridgeY - m.y) * inside * lit;
    mountainColor += vec3(0.85, 0.35, 0.25) * 0.28 * rim;

    // Atmospheric depth: the base dissolves into haze instead of hitting the frame
    float haze = smoothstep(-0.24, -0.5, m.y);
    mountainColor = mix(mountainColor, vec3(0.13, 0.13, 0.15), haze * 0.55);
    float a_mnt = inside * mntReveal * 0.88 * (1.0 - haze * 0.5);
    over(acc, accA, mountainColor, a_mnt);

    // MIST: two banks drifting slowly across the lower slopes, in front of the mountain
    float bank = exp(-pow((uv.y + 0.29) / 0.07, 2.0)) + 0.8 * exp(-pow((uv.y + 0.43) / 0.08, 2.0));
    float mistNoise = fbm(vec2(uv.x * 2.2 + drift * 0.035, uv.y * 7.0 - drift * 0.01));
    float mist = smoothstep(0.32, 0.72, mistNoise) * bank * 0.6 * t_mist;
    over(acc, accA, vec3(0.62, 0.59, 0.58), mist);

    // Un-premultiply for a non-premultiplied canvas
    fragColor = vec4(accA > 0.0001 ? acc / accA : vec3(0.0), accA);
}
