#version 300 es
precision highp float;

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

// Reduced from 5 octaves to 3 — still organic, ~40% cheaper
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

// Organic Calligraphy Brush Stroke
float brushStroke(vec2 p, vec2 a, vec2 b, float rStart, float rEnd, float droop, float noiseVal) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    
    vec2 pBended = p;
    pBended.y += sin(h * 3.14159) * droop;
    
    pa = pBended - a;
    float d = length(pa - ba * h);
    float taper = smoothstep(1.0, 0.0, h);
    float r = mix(rEnd, rStart, taper);
    
    // Increased noise multiplier to make brush edges rougher
    return d - r - (noiseVal * 0.015);
}

void main() {
    vec2 fragCoord = vUv * uResolution;
    float iTime = uTime;
    vec2 iResolution = uResolution;

    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // animation times
    float t = iTime * 0.8; 
    float t_sun     = clamp((t - 0.5) / 1.5, 0.0, 1.0); 
    float t_branch  = clamp((t - 1.5) / 2.0, 0.0, 1.0); 
    float t_flowers = clamp((t - 3.5) / 2.5, 0.0, 1.0); 
    float swayStrength = 0.02 * (1.0 - smoothstep(3.5, 5.5, t));
    
    vec3 rgb = vec3(0.0);
    float alpha = 0.0;
    float wetEdgeJitter = fbm(uv * 40.0) * 0.08;

    // 2. THE RED SUN 
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

    // 3. MOUNTAIN (Skipped)
    float a_mnt = 0.0; 

    // 4. BRANCHES
    vec2 branchUV = uv;
    branchUV.x += sin(iTime * 1.5 + uv.y * 3.0) * swayStrength;
    branchUV.y += cos(iTime * 1.2 + uv.x * 2.0) * swayStrength;

    vec2 n0 = vec2(-1.0, -0.2);
    vec2 n1 = vec2(-0.6,  0.0);
    vec2 n2 = vec2(-0.2,  0.1);
    
    vec2 t1 = vec2( 0.2,  0.15);
    vec2 t2 = vec2(-0.2, -0.15);
    vec2 t3 = vec2(-0.0,  0.3);
    vec2 t4 = vec2(-0.6, -0.25);
    vec2 t5 = vec2(-0.1, -0.0);

    float bd = 10.0;
    float branchNoise = fbm(branchUV * 60.0);
    
    bd = min(bd, brushStroke(branchUV, n0, n1, 0.020, 0.015, 0.03, branchNoise));
    bd = min(bd, brushStroke(branchUV, n1, n2, 0.015, 0.010, 0.03, branchNoise));
    bd = min(bd, brushStroke(branchUV, n2, t1, 0.010, 0.003, 0.02, branchNoise)); 
    
    vec2 s1_mid = vec2(-0.4, -0.05);
    bd = min(bd, brushStroke(branchUV, n1, s1_mid, 0.00, 0.006, -0.02, branchNoise)); 
    bd = min(bd, brushStroke(branchUV, s1_mid, t2, 0.006, 0.002, 0.01, branchNoise)); 
    
    bd = min(bd, brushStroke(branchUV, n2, t3, 0.01, 0.009, -0.02, branchNoise));    
    
    vec2 s3_start = mix(n0, n1, 0.2);
    bd = min(bd, brushStroke(branchUV, s3_start, t4, 0.008, 0.002, 0.01, branchNoise)); 
    
    vec2 s4_start = mix(n1, n2, 0.9);
    bd = min(bd, brushStroke(branchUV, s4_start, t5, 0.006, 0.002, 0.01, branchNoise)); 

    float branchMask = smoothstep(0.004, -0.002, bd);
    float branchReveal = smoothstep(0.05, -0.05, branchUV.x - (t_branch * 1.5 - 1.0) + wetEdgeJitter);
    
    float branchTex = fbm(branchUV * 40.0);
    vec3 branchColor = mix(vec3(0.5, 0.55, 0.6), vec3(1.0, 1.0, 1.0), branchTex);
    
    float a_branch = branchMask * branchReveal;
    rgb = mix(rgb, branchColor, a_branch);
    alpha = max(alpha, a_branch);

    // 5. FLOWERS 
    float flowerMask = 0.0;
    vec2 targets[5];
    targets[0] = t1; targets[1] = t2; targets[2] = t3; 
    targets[3] = t4; targets[4] = t5; 
    
    float globalFlowerTex = fbm(branchUV * 70.0);
    
    for(int i = 0; i < 5; i++) {
        float individualTime = clamp((t_flowers - float(i)*0.2) * 5.0, 0.0, 1.0);
        
        if (individualTime > 0.0) {
            vec2 center = targets[i];
            
            for(float j = 0.0; j < 3.0; j++) {
                vec2 offset = vec2(noise(vec2(float(i), j*10.0)) - 0.5, noise(vec2(float(i), j*20.0)) - 0.5) * 0.03;
                vec2 fpos = center + offset;
                
                float currentRadius = mix(0.0, 0.012, smoothstep(0.0, 1.0, individualTime));
                float fdist = length(branchUV - fpos) - currentRadius - (globalFlowerTex * 0.045 + j * 0.002);
                
                flowerMask = max(flowerMask, smoothstep(0.008, -0.005, fdist));
            }
        }
    }
    
    float a_flower = flowerMask;
    rgb = mix(rgb, vec3(1.0, 0.4, 0.5), a_flower);
    alpha = max(alpha, a_flower);

    fragColor = vec4(rgb, alpha);
}
