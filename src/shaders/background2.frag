#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec2 uv = vUv;
    uv.y -= 1.5;
    uv.x += .2;

    float offsetTime = .5;

    vec2 p = uv;
    float t1 = uTime * 3. * offsetTime;
    float t2 = uTime * 1. * offsetTime;

    p.y *= (p.x * p.y) * sin(p.y * p.x * 2. + t1);

    float d = length(p * .7);

    vec3 c0 = vec3(1.);
    vec3 c1 = vec3(.365, .794, .935);
    vec3 c2 = vec3(.973, .671, .961);
    vec3 c3 = vec3(.973, .843, .439);

    float offset = 1.2;
    float step1 = .05 * offset + sin(t2 * 3.) * .1;
    float step2 = 0.3 * offset + sin(t2) * .15;
    float step3 = 0.6 * offset + sin(t2) * .1;
    float step4 = 1.2 * offset + sin(t2 * 3.) * .2;

    vec3 col = mix(c0, c1, smoothstep(step1, step2, d));
    col = mix(col, c2, smoothstep(step2, step3, d));
    col = mix(col, c3, smoothstep(step3, step4, d));

    // Film grain applied via CSS overlay — not in shader
    fragColor = vec4(col, 1.0);
}
