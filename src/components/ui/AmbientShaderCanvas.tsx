import React, { useEffect, useRef, memo } from 'react';

interface AmbientShaderCanvasProps {
  className?: string;
  opacity?: number;
}

const AmbientShaderCanvasInner: React.FC<AmbientShaderCanvasProps> = ({
  className = "fixed inset-0 w-full h-full -z-10 pointer-events-none",
  opacity = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    let animationFrameId: number;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    syncSize();
    window.addEventListener('resize', syncSize);

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 a0 = x - floor(x + 0.5);
        float m0 = 1.79284291400159 - 0.85373472095314 * ( a0[0]*a0[0] + h[0]*h[0] );
        m[0] *= m0;
        m[1] *= ( 1.79284291400159 - 0.85373472095314 * ( a0[1]*a0[1] + h[1]*h[1] ) );
        m[2] *= ( 1.79284291400159 - 0.85373472095314 * ( a0[2]*a0[2] + h[2]*h[2] ) );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = v_texCoord;
        float n = snoise(uv * 2.5 + u_time * 0.06);

        // Elegant Dark Palette: Deep Navy, Midnight Emerald, Soft Purple/Violet, Dark Slate
        vec3 darkSlate = vec3(0.04, 0.06, 0.09);
        vec3 deepEmerald = vec3(0.06, 0.18, 0.14);
        vec3 softPurple = vec3(0.12, 0.09, 0.22);
        vec3 background = vec3(0.03, 0.04, 0.06);

        vec3 color = mix(background, deepEmerald, smoothstep(0.1, 0.8, n));
        color = mix(color, softPurple, smoothstep(0.3, 0.9, n));
        color = mix(color, darkSlate, smoothstep(0.5, 1.0, n));

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compileShader(type: number, source: string) {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    }

    const vertShader = compileShader(gl.VERTEX_SHADER, vs);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vertShader || !fragShader) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    function render(t: number) {
      if (!gl || !canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }

    render(0);

    return () => {
      window.removeEventListener('resize', syncSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={className} style={{ opacity }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export const AmbientShaderCanvas = memo(AmbientShaderCanvasInner);
