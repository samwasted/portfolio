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

float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
    }
    return value;
}

// Organic Calligraphy Brush Stroke (Guarantees A -> B connection)
float brushStroke(vec2 p, vec2 a, vec2 b, float rStart, float rEnd, float droop) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    
    vec2 pBended = p;
    pBended.y += sin(h * 3.14159) * droop;
    
    // Recalculate distance from the newly bended space
    pa = pBended - a;
    float d = length(pa - ba * h);
    float taper = smoothstep(1.0, 0.0, h);
    float r = mix(rEnd, rStart, taper);
    
    return d - r - (fbm(p * 60.0) * 0.005);
}

void main() {
    vec2 fragCoord = vUv * uResolution;
    float iTime = uTime;
    vec2 iResolution = uResolution;

    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // animation times (shifted forward so branch appears instantly)
    float t = iTime * 0.8; 
    float t_branch  = clamp(t / 2.0, 0.0, 1.0); 
    float t_flowers = clamp((t - 1.5) / 2.5, 0.0, 1.0); 
    float swayStrength = smoothstep(3.0, 5.0, t) * 0.02;         
    
    float wetEdgeJitter = fbm(uv * 40.0) * 0.08;

    vec3 rgb = vec3(0.0);
    float alpha = 0.0;

    // 4. BRANCHES
    vec2 branchUV = uv;

    // Apply a coordinate space transformation to shift and rotate the entire branch
    // Shift left on screen (positive X in shader), push root OFF the top edge of screen (more negative Y)
    vec2 shift = vec2(0.6, -0.4);
    branchUV -= shift;

    // Rotate the branch to point more vertically downwards
    float angle = 0.6; // ~35 degrees CW rotation on screen
    float s = sin(angle);
    float c = cos(angle);
    mat2 rot = mat2(c, -s, s, c);
    
    vec2 baseRoot = vec2(-1.0, -0.2);
    branchUV = baseRoot + rot * (branchUV - baseRoot);

    vec2 n0 = vec2(-1.0, -0.2);  // Root
    vec2 n1 = vec2(-0.6,  0.0);  // Joint 1
    vec2 n2 = vec2(-0.2,  0.1);  // Joint 2
    
    vec2 t1 = vec2( 0.2,  0.15); // Tip 1
    vec2 t2 = vec2(-0.2, -0.15); // Tip 2
    vec2 t3 = vec2(-0.0,  0.3);  // Tip 3
    vec2 t4 = vec2(-0.6, -0.25); // Tip 4
    vec2 t5 = vec2(-0.1, -0.0);  // Tip 5

    float bd = 10.0;
    
    // Main Trunk
    bd = min(bd, brushStroke(branchUV, n0, n1, 0.020, 0.015, 0.03));
    bd = min(bd, brushStroke(branchUV, n1, n2, 0.015, 0.010, 0.03));
    bd = min(bd, brushStroke(branchUV, n2, t1, 0.010, 0.003, 0.02)); 
    
    // Lower Sub Branch 1
    vec2 s1_mid = vec2(-0.4, -0.05);
    bd = min(bd, brushStroke(branchUV, n1, s1_mid, 0.00, 0.006, -0.02)); 
    bd = min(bd, brushStroke(branchUV, s1_mid, t2, 0.006, 0.002, 0.01)); // Connects perfectly to t2
    
    // Upper Sub Branch 2
    bd = min(bd, brushStroke(branchUV, n2, t3, 0.01, 0.009, -0.02));    // Connects perfectly to t3
    
    // Inner Sub Branch 3
    vec2 s3_start = mix(n0, n1, 0.2);
    bd = min(bd, brushStroke(branchUV, s3_start, t4, 0.008, 0.002, 0.01)); // Connects perfectly to t4
    
    // Forward Sub Branch 4
    vec2 s4_start = mix(n1, n2, 0.9);
    bd = min(bd, brushStroke(branchUV, s4_start, t5, 0.006, 0.002, 0.01)); // Connects perfectly to t5

    float branchMask = smoothstep(0.004, -0.002, bd);
    
    // Since branchUV is transformed, we can use the original local space reveal timing
    float branchReveal = smoothstep(0.05, -0.05, branchUV.x - (t_branch * 1.5 - 1.0) + wetEdgeJitter);
    
    // Make the branch bright silver/white so it is highly visible on dark backgrounds
    float branchTex = fbm(branchUV * 40.0);
    vec3 branchColor = mix(vec3(0.7, 0.75, 0.8), vec3(0.9, 0.95, 1.0), branchTex);
    
    float a_branch = branchMask * branchReveal;
    rgb = mix(rgb, branchColor, a_branch);
    alpha = max(alpha, a_branch);

    // 5. FLOWERS 
    float flowerMask = 0.0;
    vec2 targets[5];
    targets[0] = t1; targets[1] = t2; targets[2] = t3; 
    targets[3] = t4; targets[4] = t5; 
    
    for(int i = 0; i < 5; i++) {
        // Tight overlapping stagger: start the next flower before the previous finishes
        float individualTime = clamp((t_flowers - float(i)*0.05) * 4.0, 0.0, 1.0);
        
        if (individualTime > 0.0) {
            vec2 center = targets[i];
            
            // Draw a cluster of 3 textured splotches exactly on the tip
            for(float j = 0.0; j < 3.0; j++) {
                vec2 offset = vec2(noise(vec2(float(i), j*10.0)) - 0.5, noise(vec2(float(i), j*20.0)) - 0.5) * 0.03;
                vec2 fpos = center + offset;
                
                float currentRadius = mix(0.0, 0.012, smoothstep(0.0, 1.0, individualTime));
                float fdist = length(branchUV - fpos) - currentRadius - fbm(branchUV * 70.0 + float(i)*j) * 0.02;
                
                flowerMask = max(flowerMask, smoothstep(0.008, -0.005, fdist));
            }
        }
    }
    
    float a_flower = flowerMask;
    rgb = mix(rgb, vec3(0.85, 0.1, 0.2), a_flower);
    alpha = max(alpha, a_flower);

    fragColor = vec4(rgb, alpha);
}
