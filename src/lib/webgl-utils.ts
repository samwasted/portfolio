/**
 * WebGL Utility Functions
 * Shared boilerplate for all shader components.
 * Handles shader compilation, program linking, fullscreen quad creation, and canvas resizing.
 * Explicitly cleans up GPU resources on compilation failure to avoid memory leaks during hot-reload.
 */

/**
 * Compile a single shader (vertex or fragment).
 * Returns the compiled shader, or null if compilation fails (shader is deleted on failure).
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('[webgl-utils] Failed to create shader object');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    console.error(`[webgl-utils] Shader compile error:\n${info}`);
    gl.deleteShader(shader); // Explicit cleanup on failure
    return null;
  }

  return shader;
}

/**
 * Create a shader program from vertex and fragment source strings.
 * On failure, all intermediate shaders and the program are deleted.
 */
export function createShaderProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  if (!vert) return null;

  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!frag) {
    gl.deleteShader(vert); // Clean up already-compiled vert
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    console.error('[webgl-utils] Failed to create program object');
    return null;
  }

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error(`[webgl-utils] Program link error:\n${info}`);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    gl.deleteProgram(program); // Explicit cleanup on link failure
    return null;
  }

  // Shaders can be detached and deleted after successful link
  gl.detachShader(program, vert);
  gl.detachShader(program, frag);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  return program;
}

/**
 * Create a fullscreen quad VAO (two triangles covering the viewport).
 * Returns the VAO to bind before drawing.
 */
export function createFullscreenQuad(gl: WebGL2RenderingContext): WebGLVertexArrayObject | null {
  const vao = gl.createVertexArray();
  if (!vao) return null;

  gl.bindVertexArray(vao);

  const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  return vao;
}

/**
 * Resize a canvas to match its display size, accounting for device pixel ratio.
 * Returns true if the canvas was actually resized.
 */
export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, dpr: number = 1): boolean {
  const width = Math.floor(canvas.clientWidth * dpr);
  const height = Math.floor(canvas.clientHeight * dpr);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}
