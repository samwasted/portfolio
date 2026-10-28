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

// Five octaves for clouds and mist; the 3-octave fbm stays for the paint textures
float fbm5(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amp * noise(p);
        p = p * 2.03 + vec2(1.7, 9.2);
        amp *= 0.5;
    }
    return value;
}

// Thin cloud bands: stretched sideways and domain-warped so they read as wisps
float cloudBands(vec2 uv, float drift) {
    vec2 p = vec2(uv.x * 1.6 + drift * 0.028, uv.y * 7.5);
    vec2 warp = vec2(fbm5(p * 0.6 + vec2(0.0, drift * 0.012)), fbm5(p * 0.6 + vec2(5.2, 1.3 - drift * 0.008)));
    return fbm5(p + warp * 1.4);
}

// Fog that churns as it drifts: the flow carries it sideways while a slowly
// changing warp reshapes it, instead of one rigid pattern sliding across
float fogBank(vec2 uv, float drift, float speed, float seed) {
    vec2 q = vec2(uv.x * 2.0, uv.y * 6.5) + vec2(seed, 0.0);
    vec2 warp = vec2(fbm5(q * 0.5 + vec2(0.0, drift * 0.02)), fbm5(q * 0.5 + vec2(4.1, -drift * 0.016)));
    return fbm5(q + vec2(drift * speed, 0.0) + warp * 1.25);
}

const vec3 SUN_COL = vec3(0.9, 0.16, 0.14);

void main() {
    vec2 fragCoord = vUv * uResolution;
    vec2 uv = (fragCoord - 0.5 * uResolution.xy) / uResolution.y;

    // Reveal timeline (one-off), then a clock that keeps running for the mist
    float t = uTime * 0.8;
    float t_sun = clamp((t - 0.5) / 1.5, 0.0, 1.0);
    float t_mnt = clamp((t - 0.8) / 2.0, 0.0, 1.0);
    // Fog is there almost at once, so the mountain paints itself in behind it
    float t_mist = smoothstep(0.2, 1.4, uTime);

    // Clouds and fog start mid-drift, at a moment where they already cover the
    // sky well, instead of forming from scratch in front of the visitor
    const float DRIFT_START = 41.0;
    float drift = uTime + DRIFT_START;

    vec3 acc = vec3(0.0);
    float accA = 0.0;
    float wetEdgeJitter = fbm(uv * 40.0) * 0.08;

    // COMPOSITION: laid out for a wide screen. On portrait screens the sun would
    // land far outside the frame, so it moves into the top-right corner and
    // shrinks, and the mountain scales down a little so its shape still reads
    float aspect = uResolution.x / uResolution.y;
    float portrait = smoothstep(1.1, 0.65, aspect);
    vec2 SUN = mix(vec2(0.6, 0.3), vec2(aspect * 0.5 - 0.09, 0.385), portrait);
    float sunR = mix(0.18, 0.085, portrait);
    float mntK = mix(1.0, 1.3, portrait);
    float mntOy = mix(0.0, -0.0815, portrait);

    vec2 sunUV = uv - SUN;
    // Warmth falls off relative to the sun's size, so a small portrait sun
    // doesn't tint the whole narrow sky
    float sunNear = exp(-length(sunUV) * 1.7 * (0.18 / sunR));
    float t_sky = smoothstep(0.0, 0.6, uTime);

    // Everything in the sky is translucent, so the background photo's grain shows through.
    // A faint warm haze where the sun lights the air
    over(acc, accA, vec3(0.32, 0.07, 0.06), sunNear * 0.22 * t_sky);

    // High cloud bands above the mountain and a lower bank behind it, warm toward
    // the sun and cool grey away from it
    // Wide screens: a broad band across the upper sky. Portrait: the intro text
    // fills the middle, so clouds keep to the empty sky around the sun at the top
    // and just above the summit
    float bandWide = smoothstep(-0.02, 0.1, uv.y) * smoothstep(0.5, 0.3, uv.y);
    // Ragged lower edge, so the band never ends in a straight line
    float edgeNoise = (fbm(vec2(uv.x * 6.0 + drift * 0.03, 2.0)) - 0.5) * 0.1;
    float bandTall = smoothstep(0.22, 0.38, uv.y + edgeNoise) * smoothstep(0.52, 0.43, uv.y);
    // Low wisp: behind the summit on wide screens; on portrait the mountain fills
    // the width there, so it floats in the open sky just above the peak instead
    float lowY = mix(-0.14, -0.145, portrait);
    float lowW = mix(0.07, 0.03, portrait);
    float band = mix(bandWide, bandTall, portrait)
               + mix(0.6, 0.9, portrait) * exp(-pow((uv.y - lowY) / lowW, 2.0));

    // The streaks are long and wide; on a narrow screen, tighten them sideways so
    // whole wisps fit across instead of one flat slice of a single streak
    vec2 cuv = vec2(uv.x * mix(1.0, 2.4, portrait), uv.y);
    // Lower threshold than a dark sky would need: over the photo the streak
    // cores have to reach full density to read
    float cloud = smoothstep(0.28, 0.52, cloudBands(cuv, drift)) * band;
    vec3 cloudCol = mix(vec3(0.2, 0.2, 0.23), vec3(0.55, 0.17, 0.14), sunNear);
    over(acc, accA, cloudCol, cloud * mix(0.55, 0.75, sunNear) * mix(1.0, 1.25, portrait) * t_sky);

    // SKY GLOW: the sun lights the air around it, breathing very slowly
    float glow = exp(-max(length(sunUV) - (sunR - 0.02), 0.0) * 5.5);
    glow *= (0.07 + 0.012 * sin(drift * 0.5)) * t_sun;
    over(acc, accA, SUN_COL * 0.7, glow);

    // THE SUN: a soft watercolour disc
    float sunDist = length(sunUV) - sunR + fbm(uv * 10.0) * 0.04 * (sunR / 0.18);
    float edge = 0.05 * (sunR / 0.18);
    float sunShape = smoothstep(edge, -edge, sunDist);
    float sunReveal = smoothstep(0.02, -0.02, (sunUV.x + sunUV.y) - (t_sun * 0.6 - 0.3) + wetEdgeJitter);
    sunShape *= (fbm(uv * 20.0) * 0.3 + 0.7) * sunReveal;
    over(acc, accA, SUN_COL, clamp(sunShape * 0.66, 0.0, 1.0));

    // A thin wisp drifts across the sun's face, dark against it, for depth
    float wisp = smoothstep(0.58, 0.85, cloudBands(cuv + vec2(0.0, 0.03), drift))
               * exp(-pow((uv.y - SUN.y + 0.02) / 0.05, 2.0)) * sunShape;
    over(acc, accA, vec3(0.06, 0.03, 0.03), wisp * 0.55);

    // MOUNTAIN: Fuji's profile, a flat notched crater rim over concave slopes
    // Mountain space: identity on wide screens, scaled down and lowered on portrait
    vec2 mu = (uv - vec2(0.0, mntOy)) * mntK;
    vec2 m = mu;
    m.x += fbm(mu * 10.0) * 0.05;
    m.y += fbm(mu * 15.0) * 0.03;
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
    vec3 rock = mix(rockShadow, rockLit, lit) * (0.65 + 0.35 * fbm(mu * 40.0));

    // Snow takes the same light: warm where the sun reaches, cool blue in shadow
    float snowLine = -0.23 + abs(fx) * 0.5 + fbm(mu * 30.0) * 0.04;
    float snow = smoothstep(snowLine - 0.01, snowLine + 0.01, m.y);
    vec3 snowShadow = vec3(0.36, 0.39, 0.47);
    vec3 snowLit = vec3(0.93, 0.86, 0.82);
    vec3 snowCol = mix(snowShadow, snowLit, lit) * (0.86 + 0.14 * fbm(mu * 30.0));
    vec3 mountainColor = mix(rock, snowCol, snow);

    // A thin warm rim where the sunlit ridge meets the sky
    float rim = smoothstep(0.018, 0.0, ridgeY - m.y) * inside * lit;
    mountainColor += vec3(0.85, 0.35, 0.25) * 0.28 * rim;

    // Atmospheric depth: the base dissolves into haze instead of hitting the frame
    // On portrait the mountain fills the bottom of the screen, so its lower slopes
    // fall into deeper dusk shadow; that keeps the lighter fog readable against them
    float haze = smoothstep(mix(-0.24, -0.12, portrait), -0.5, m.y);
    vec3 hazeCol = mix(vec3(0.13, 0.13, 0.15), vec3(0.055, 0.055, 0.07), portrait);
    mountainColor = mix(mountainColor, hazeCol, haze * mix(0.55, 0.8, portrait));
    float a_mnt = inside * mntReveal * 0.88 * (1.0 - haze * 0.5);
    over(acc, accA, mountainColor, a_mnt);

    // MIST: two fog banks over the lower slopes. The farther one sits higher and
    // drifts slower; both churn as they move, and their tops catch a little sunlight
    float farBank = exp(-pow((uv.y + 0.29) / 0.07, 2.0));
    float nearBank = exp(-pow((uv.y + 0.43) / 0.09, 2.0));
    float farFog = smoothstep(0.34, 0.72, fogBank(uv, drift, 0.02, 0.0)) * farBank;
    float nearFog = smoothstep(0.34, 0.72, fogBank(uv, drift, 0.045, 13.7)) * nearBank;
    vec3 fogCol = mix(vec3(0.56, 0.54, 0.55), vec3(0.66, 0.58, 0.56), sunNear);
    float fogBoost = mix(1.0, 1.3, portrait);
    over(acc, accA, fogCol * 0.92, min(farFog * 0.5 * fogBoost, 1.0) * t_mist);
    over(acc, accA, fogCol, min(nearFog * 0.62 * fogBoost, 1.0) * t_mist);

    // Un-premultiply for a non-premultiplied canvas
    fragColor = vec4(accA > 0.0001 ? acc / accA : vec3(0.0), accA);
}
