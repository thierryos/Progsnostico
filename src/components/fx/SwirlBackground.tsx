import { useEffect, useRef, useState } from 'react';

/** Resolução reduzida (1 px do shader = 3 px de CSS), ampliada com suavização: barato e liso. */
const PIXEL = 3;
const FPS = 24;

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * Redemoinho de tinta: coordenadas polares torcidas + distorção de domínio, nas cores do
 * feltro, vinho e um brilho dourado. Um ruído mínimo (dithering) evita faixas de cor.
 */
const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;

const vec3 DEEP = vec3(0.02, 0.08, 0.06);
const vec3 FELT = vec3(0.06, 0.23, 0.15);
const vec3 WINE = vec3(0.27, 0.06, 0.09);
const vec3 GOLD = vec3(0.60, 0.44, 0.09);

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime * 0.08;
  float r = length(uv);
  float ang = atan(uv.y, uv.x) + 1.8 * (1.0 - smoothstep(0.0, 1.3, r)) + t * 0.6;
  vec2 p = vec2(cos(ang), sin(ang)) * r * 3.2;

  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    p += 0.55 * vec2(sin(p.y * 1.7 + t * 2.1 + fi * 1.3), cos(p.x * 1.5 - t * 1.7 + fi * 2.1));
  }

  float band = 0.5 + 0.5 * sin(p.x * 1.2 + p.y * 0.9);
  float glint = 0.5 + 0.5 * sin(length(p) * 2.2 - t * 3.0);
  vec3 col = mix(DEEP, FELT, smoothstep(0.15, 0.85, band));
  col = mix(col, WINE, smoothstep(0.62, 0.95, 1.0 - band) * 0.85);
  col += GOLD * smoothstep(0.94, 1.0, glint) * 0.28;
  col *= 1.0 - 0.45 * smoothstep(0.35, 1.25, r);
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) / 96.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[swirl]', gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
};

const setup = (gl: WebGLRenderingContext) => {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  return {
    res: gl.getUniformLocation(program, 'uRes'),
    time: gl.getUniformLocation(program, 'uTime'),
  };
};

/**
 * Fundo animado dos menus. `animate=false` desenha um quadro parado (na partida, para
 * poupar bateria). Sem WebGL, some e deixa o fundo de feltro do CSS.
 */
export const SwirlBackground = ({ animate }: { animate: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const clock = useRef(12);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: false, depth: false, alpha: false });
    const uniforms = gl ? setup(gl) : null;
    if (!canvas || !gl || !uniforms) {
      setFailed(true);
      return;
    }

    const draw = () => {
      const w = Math.max(1, Math.ceil(canvas.clientWidth / PIXEL));
      const h = Math.max(1, Math.ceil(canvas.clientHeight / PIXEL));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uniforms.res, w, h);
      gl.uniform1f(uniforms.time, clock.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < 1000 / FPS) return;
      clock.current += Math.min(0.25, (now - last) / 1000);
      last = now;
      draw();
    };

    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    const onLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    draw();
    if (animate) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
    };
  }, [animate]);

  if (failed) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};
