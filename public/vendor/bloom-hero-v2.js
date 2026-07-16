/* <bloom-hero-v2> - premium ambient botanical hero for BloomSense.
   Layered composition (foreground bokeh blooms / midground cluster / out-of-focus
   background), physical materials with fabric sheen + fast-SSS approximation,
   PMREM studio-daylight environment, manual HDR post pipeline:
   scene -> bright-pass bloom -> depth-based bokeh DoF -> ACES filmic + warm grade
   + vignette + film grain. 50mm-equivalent lens, slow drift, mouse parallax.

   Design handoff artifact (Claude Design, landing v2). Sole local edit:
   THREE_URL points at the self-hosted module build so the strict CSP
   (script-src 'self') admits it — the original loaded three from unpkg. */
(function () {
  if (customElements.get('bloom-hero-v2')) return;
  const THREE_URL = '/vendor/three-0.161.0.module.js';

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  const mulberry = (s) => () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ======================= procedural texture kit =======================
  function canvas2d(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }
  function noiseSpeckle(ctx, w, h, n, rgba, rMin, rMax, rnd) {
    for (let i = 0; i < n; i++) {
      const r = rMin + rnd() * (rMax - rMin);
      ctx.fillStyle = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3] * (0.4 + rnd() * 0.6)})`;
      ctx.beginPath();
      ctx.ellipse(rnd() * w, rnd() * h, r, r * (0.5 + rnd()), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function heightToNormal(src, strength) {
    const w = src.width, h = src.height;
    const sctx = src.getContext('2d');
    const d = sctx.getImageData(0, 0, w, h).data;
    const [out, octx] = canvas2d(w, h);
    const img = octx.createImageData(w, h);
    const lum = (x, y) => {
      x = (x + w) % w; y = (y + h) % h;
      const i = (y * w + x) * 4;
      return (d[i] + d[i + 1] + d[i + 2]) / 765;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
      const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * w + x) * 4;
      img.data[i] = (-dx * inv * 0.5 + 0.5) * 255;
      img.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      img.data[i + 2] = (inv * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    return out;
  }
  function makePetalMaps() {
    const rnd = mulberry(11);
    // ---- albedo: near-white warm base so material.color drives the hue ----
    const [alb, a] = canvas2d(512, 512);
    const g = a.createRadialGradient(256, 520, 40, 256, 520, 560);
    g.addColorStop(0, '#FAF1EA'); g.addColorStop(0.55, '#F7EBE5'); g.addColorStop(1, '#F1DFDA');
    a.fillStyle = g; a.fillRect(0, 0, 512, 512);
    // fanned streaks from the base - subtle color variation
    for (let i = 0; i < 120; i++) {
      const x0 = 200 + rnd() * 112, spread = (rnd() - 0.5) * 460;
      a.strokeStyle = `rgba(${205 + rnd() * 30 | 0},${150 + rnd() * 40 | 0},${150 + rnd() * 30 | 0},${0.05 + rnd() * 0.09})`;
      a.lineWidth = 0.6 + rnd() * 1.8;
      a.beginPath();
      a.moveTo(x0, 512);
      a.quadraticCurveTo(x0 + spread * 0.4, 300 + (rnd() - 0.5) * 80, 256 + spread, -10);
      a.stroke();
    }
    // deeper tone at the very base + natural imperfections
    const bg = a.createLinearGradient(0, 512, 0, 340);
    bg.addColorStop(0, 'rgba(208,148,140,0.22)'); bg.addColorStop(1, 'rgba(208,148,140,0)');
    a.fillStyle = bg; a.fillRect(0, 340, 512, 172);
    const eb = a.createLinearGradient(0, 0, 512, 0);
    eb.addColorStop(0, 'rgba(206,142,142,0.13)'); eb.addColorStop(0.10, 'rgba(206,142,142,0)');
    eb.addColorStop(0.90, 'rgba(206,142,142,0)'); eb.addColorStop(1, 'rgba(206,142,142,0.13)');
    a.fillStyle = eb; a.fillRect(0, 0, 512, 512);
    noiseSpeckle(a, 512, 512, 90, [255, 255, 255, 0.05], 1, 5, rnd);
    noiseSpeckle(a, 512, 512, 60, [190, 130, 125, 0.045], 1, 4, rnd);
    // ---- height -> normal ----
    const [hgt, hx] = canvas2d(256, 256);
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      const x0 = 100 + rnd() * 56, spread = (rnd() - 0.5) * 230;
      hx.strokeStyle = `rgba(${rnd() > 0.5 ? 165 : 95},${rnd() > 0.5 ? 165 : 95},${rnd() > 0.5 ? 165 : 95},0.25)`;
      hx.lineWidth = 1 + rnd() * 2.4;
      hx.beginPath();
      hx.moveTo(x0, 256);
      hx.quadraticCurveTo(x0 + spread * 0.4, 150, 128 + spread, -5);
      hx.stroke();
    }
    noiseSpeckle(hx, 256, 256, 160, [160, 160, 160, 0.20], 1, 6, rnd);
    noiseSpeckle(hx, 256, 256, 160, [96, 96, 96, 0.20], 1, 6, rnd);
    const nrm = heightToNormal(hgt, 1.5);
    // ---- roughness variation ----
    const [rgh, r] = canvas2d(256, 256);
    r.fillStyle = '#9A9A9A'; r.fillRect(0, 0, 256, 256);
    noiseSpeckle(r, 256, 256, 220, [140, 140, 140, 0.25], 2, 9, rnd);
    noiseSpeckle(r, 256, 256, 220, [110, 110, 110, 0.25], 2, 9, rnd);
    return { alb, nrm, rgh };
  }
  function makeLeafMaps() {
    const rnd = mulberry(23);
    const [alb, a] = canvas2d(512, 512);
    const g = a.createLinearGradient(0, 512, 0, 0);
    g.addColorStop(0, '#75886B'); g.addColorStop(0.5, '#81956F'); g.addColorStop(1, '#8CA07A');
    a.fillStyle = g; a.fillRect(0, 0, 512, 512);
    noiseSpeckle(a, 512, 512, 150, [58, 82, 52, 0.06], 3, 14, rnd);
    noiseSpeckle(a, 512, 512, 150, [190, 205, 165, 0.05], 2, 10, rnd);
    const vein = (ctx, cw, midW, sideW, midC, sideC) => {
      ctx.strokeStyle = midC; ctx.lineWidth = midW; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cw / 2, cw); ctx.lineTo(cw / 2, 6); ctx.stroke();
      for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 9; i++) {
        const y0 = cw * 0.94 - i * cw * 0.096;
        ctx.strokeStyle = sideC; ctx.lineWidth = sideW * (1 - i * 0.05);
        ctx.beginPath();
        ctx.moveTo(cw / 2, y0);
        ctx.quadraticCurveTo(cw / 2 + s * cw * 0.19, y0 - cw * 0.09, cw / 2 + s * (cw * 0.40 - i * 6), y0 - cw * 0.16);
        ctx.stroke();
      }
    };
    vein(a, 512, 7, 2.6, 'rgba(198,212,170,0.75)', 'rgba(186,200,158,0.5)');
    const [hgt, hx] = canvas2d(256, 256);
    hx.fillStyle = '#7a7a7a'; hx.fillRect(0, 0, 256, 256);
    vein(hx, 256, 5, 2, 'rgba(210,210,210,0.9)', 'rgba(185,185,185,0.7)');
    noiseSpeckle(hx, 256, 256, 180, [120, 120, 120, 0.25], 1, 5, rnd);
    const nrm = heightToNormal(hgt, 1.8);
    const [rgh, r] = canvas2d(128, 128);
    r.fillStyle = '#8F8F8F'; r.fillRect(0, 0, 128, 128);
    noiseSpeckle(r, 128, 128, 120, [125, 125, 125, 0.3], 2, 7, rnd);
    return { alb, nrm, rgh };
  }
  function makeSoftSprite(sz, inner) {
    const [c, x] = canvas2d(sz, sz);
    const g = x.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
    g.addColorStop(0, `rgba(255,252,246,${inner})`);
    g.addColorStop(0.5, `rgba(255,250,242,${inner * 0.35})`);
    g.addColorStop(1, 'rgba(255,250,242,0)');
    x.fillStyle = g; x.fillRect(0, 0, sz, sz);
    return c;
  }
  function makeBgGradient() {
    const [c, x] = canvas2d(16, 512);
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#FDFAF4'); g.addColorStop(0.5, '#F9F3E8'); g.addColorStop(1, '#F2E8D7');
    x.fillStyle = g; x.fillRect(0, 0, 16, 512);
    return c;
  }

  // ======================= parametric petal geometry =====================
  // Curved spine (progressive backward curl), cross-width cupping, edge ruffle,
  // rounded tip, baked base-AO in vertex colors. Organic topology, no facets.
  function petalGeometry(T, o) {
    const segW = o.segW, segL = o.segL, len = o.len ?? 1, wid = o.wid ?? 0.52;
    const cup = o.cup ?? 0.55, curl = o.curl ?? 0.9, ruf = o.ruffle ?? 0.030;
    const rnd = mulberry(o.seed ?? 1);
    const ph1 = rnd() * Math.PI * 2, ph2 = rnd() * Math.PI * 2, fq = 2.4 + rnd() * 1.6;
    const pos = [], col = [], uv = [], idx = [];
    // integrate spine curl
    const spineY = [0], spineZ = [0], spineA = [0];
    for (let j = 1; j <= segL; j++) {
      const v = j / segL, dl = len / segL;
      const ang = curl * Math.pow(v, 1.65);
      spineA.push(ang);
      spineY.push(spineY[j - 1] + Math.cos(ang) * dl);
      spineZ.push(spineZ[j - 1] + Math.sin(ang) * dl);
    }
    for (let j = 0; j <= segL; j++) {
      const v = j / segL;
      const halfW = wid * (0.09 + 0.95 * Math.pow(Math.sin(Math.PI * Math.min(0.905, v * 0.85 + 0.055)), 0.80));
      for (let i = 0; i <= segW; i++) {
        const u = i / segW - 0.5;
        let x = u * 2 * halfW;
        let z = spineZ[j];
        // cup: edges bend toward flower axis (-Z local)
        z -= cup * (u * u * 4) * (0.22 + 0.78 * v) * wid;
        // pinched base
        if (v < 0.14) z -= (0.14 - v) * 0.9 * (u * u * 4) * wid;
        // organic edge ruffle, stronger at edges + tip
        z += ruf * wid * Math.sin(u * Math.PI * fq + v * 6.2 + ph1) * Math.pow(v, 1.5) * Math.pow(Math.abs(u) * 2, 1.25);
        z += ruf * 0.5 * wid * Math.sin(u * Math.PI * 5.1 + v * 11 + ph2) * v * v * Math.pow(Math.abs(u) * 2, 2);
        const y = spineY[j];
        pos.push(x, y, z);
        uv.push(u + 0.5, v);
        const ao = 0.60 + 0.40 * smooth(clamp01(v / 0.42));
        const edge = Math.pow(Math.abs(u) * 2, 2.2) * 0.07;
        const cshade = Math.min(1.08, ao + edge);
        col.push(cshade, cshade, cshade);
      }
    }
    for (let j = 0; j < segL; j++) for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i, b = a + segW + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  function leafGeometry(T, seed) {
    const segW = 10, segL = 12, len = 1, rnd = mulberry(seed);
    const ph = rnd() * 6.28;
    const pos = [], uv = [], idx = [], col = [];
    for (let j = 0; j <= segL; j++) {
      const v = j / segL;
      const halfW = 0.20 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.96 + 0.03)), 0.85);
      for (let i = 0; i <= segW; i++) {
        const u = i / segW - 0.5;
        const x = u * 2 * halfW;
        let z = Math.abs(u) * 2 * halfW * 0.55;                    // fold along midrib
        z += Math.pow(v, 1.8) * 0.34;                              // droop
        z += 0.012 * Math.sin(u * 9 + v * 8 + ph) * v;             // waviness
        pos.push(x, v * len, z);
        uv.push(u + 0.5, v);
        const sh = 0.78 + 0.22 * smooth(clamp01(v / 0.3));
        col.push(sh, sh, sh);
      }
    }
    for (let j = 0; j < segL; j++) for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i, b = a + segW + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  // ======================= post-processing shaders =======================
  const FSQ_VERT = `varying vec2 vUv; void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy,0.,1.); }`;
  const BRIGHT_FRAG = `
    uniform sampler2D tSrc; uniform float uTh; uniform float uKnee; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      float rq = clamp(l - uTh + uKnee, 0.0, 2.0*uKnee);
      rq = rq*rq/(4.0*uKnee + 1e-4);
      float w = max(rq, l - uTh)/max(l, 1e-4);
      gl_FragColor = vec4(c*clamp(w,0.,1.), 1.);
    }`;
  const BLUR_FRAG = `
    uniform sampler2D tSrc; uniform vec2 uDir; uniform vec2 uTexel; varying vec2 vUv;
    void main(){
      float w0=0.227027, w1=0.1945946, w2=0.1216216, w3=0.054054, w4=0.016216;
      vec3 c = texture2D(tSrc,vUv).rgb*w0;
      vec2 o1=uDir*uTexel*1.6, o2=uDir*uTexel*3.2, o3=uDir*uTexel*4.8, o4=uDir*uTexel*6.4;
      c += (texture2D(tSrc,vUv+o1).rgb + texture2D(tSrc,vUv-o1).rgb)*w1;
      c += (texture2D(tSrc,vUv+o2).rgb + texture2D(tSrc,vUv-o2).rgb)*w2;
      c += (texture2D(tSrc,vUv+o3).rgb + texture2D(tSrc,vUv-o3).rgb)*w3;
      c += (texture2D(tSrc,vUv+o4).rgb + texture2D(tSrc,vUv-o4).rgb)*w4;
      gl_FragColor = vec4(c,1.);
    }`;
  const COMP_FRAG = `
    uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tDepth;
    uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uFocus;
    uniform float uDofAmt; uniform float uMaxCoc; uniform float uBloomStr;
    uniform float uExposure; uniform float uTime; uniform float uGrain; uniform float uVig;
    varying vec2 vUv;
    float distOf(vec2 uv){
      float d = texture2D(tDepth, uv).x;
      float vz = (uNear*uFar)/((uFar-uNear)*d - uFar);
      return -vz;
    }
    float cocOf(float d){
      float c = (abs(d-uFocus) - uFocus*0.11) / (uFocus*0.9);
      return clamp(c*1.3, 0., 1.) * uDofAmt;
    }
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
    void main(){
      vec2 P[16];
      P[0]=vec2(-0.9420,-0.3990); P[1]=vec2(0.9456,-0.7689); P[2]=vec2(-0.0942,-0.9294); P[3]=vec2(0.3450,0.2939);
      P[4]=vec2(-0.9159,0.4577);  P[5]=vec2(-0.8154,-0.8791); P[6]=vec2(-0.3828,0.2768);  P[7]=vec2(0.9748,0.7565);
      P[8]=vec2(0.4432,-0.9751);  P[9]=vec2(0.5374,-0.4737);  P[10]=vec2(-0.2650,-0.4189);P[11]=vec2(0.7920,0.1909);
      P[12]=vec2(-0.2419,0.9971); P[13]=vec2(-0.8141,0.9144); P[14]=vec2(0.1998,0.7864);  P[15]=vec2(0.1438,-0.1410);
      float dC = distOf(vUv);
      float rPx = cocOf(dC) * uMaxCoc * uRes.y;
      vec3 col;
      if (rPx < 0.75) {
        col = texture2D(tScene, vUv).rgb;
      } else {
        vec2 texel = 1.0/uRes;
        vec3 acc = texture2D(tScene, vUv).rgb;
        float wsum = 1.0;
        for (int i = 0; i < 16; i++) {
          vec2 suv = vUv + P[i]*rPx*texel;
          float rS = cocOf(distOf(suv)) * uMaxCoc * uRes.y;
          float w = clamp(rS / max(rPx, 1e-3), 0.18, 1.0);
          acc += texture2D(tScene, suv).rgb * w;
          wsum += w;
        }
        col = acc/wsum;
      }
      col += texture2D(tBloom, vUv).rgb * uBloomStr;
      col *= uExposure;
      col = aces(col);
      col = mix(col, col*vec3(1.034,1.0,0.958), 0.55);              // warm filmic grade
      float vd = length(vUv-0.5)*1.30;
      col *= 1.0 - smoothstep(0.55,1.05,vd)*uVig;                    // soft vignette
      float n = fract(sin(dot(gl_FragCoord.xy + vec2(mod(uTime,10.0)*61.0), vec2(12.9898,78.233)))*43758.5453)-0.5;
      col += n * uGrain;                                             // fine film grain
      col = clamp(col, 0., 1.);
      col = mix(col*12.92, 1.055*pow(col, vec3(1.0/2.4))-0.055, step(vec3(0.0031308), col));
      gl_FragColor = vec4(col, 1.0);
    }`;

  // ============================ the element ==============================
  class BloomHeroV2 extends HTMLElement {
    static get observedAttributes() { return ['accent', 'motion', 'dof', 'particles']; }

    connectedCallback() {
      if (this._started) return;
      this._started = true;
      this.style.cssText += ';display:block;width:100%;height:100%;overflow:hidden;background:linear-gradient(#FDFAF4,#F2E8D7)';
      this._init().catch((e) => console.error('bloom-hero-v2 init failed', e));
    }
    disconnectedCallback() {
      this._dead = true;
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._io) this._io.disconnect();
      if (this._unbind) this._unbind();
      if (this._renderer) this._renderer.dispose();
      [this._sceneRT, this._brightRT, this._blurA, this._blurB].forEach((rt) => rt && rt.dispose());
    }
    attributeChangedCallback() { this._applyAttrs && this._applyAttrs(); }

    // ------------------------------------------------------------------
    async _init() {
      const THREE = await import(THREE_URL);
      if (this._dead) return;
      const T = this.T = THREE;
      this.isMobile = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
      this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

      const renderer = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
      this._renderer = renderer;
      this._pr = Math.min(devicePixelRatio || 1, this.isMobile ? 1.5 : 2);
      renderer.setPixelRatio(this._pr);
      renderer.toneMapping = T.NoToneMapping;              // tonemapped in composite
      renderer.autoClear = true;
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;opacity:0;transition:opacity 1.4s ease';
      this.appendChild(renderer.domElement);
      const gl2 = renderer.capabilities.isWebGL2;
      this._hdrType = (gl2 || renderer.extensions.has('EXT_color_buffer_half_float')) ? T.HalfFloatType : T.UnsignedByteType;
      this._canDepth = gl2 || renderer.extensions.has('WEBGL_depth_texture');
      this._ssaa = (!this.isMobile && this._pr < 1.6) ? 1.3 : 1.0;   // supersample on low-dpr displays

      // ---------------- scene, camera (50mm-equivalent), atmosphere -----
      const scene = this.scene = new T.Scene();
      const bgTex = new T.CanvasTexture(makeBgGradient());
      bgTex.colorSpace = T.SRGBColorSpace;
      scene.background = bgTex;
      scene.fog = new T.Fog(0xf3ead9, 10.5, 24);

      const camera = this.camera = new T.PerspectiveCamera(31, 1, 0.1, 40);
      this._camBase = new T.Vector3(0, 0.28, 7.4);
      this._lookBase = new T.Vector3(0.55, 0.22, 0);
      camera.position.copy(this._camBase);

      // ---------------- lighting: soft daylight key + rim + bounce ------
      this._keyDir = new T.Vector3(2.6, 4.0, 3.4).normalize();
      scene.add(new T.HemisphereLight(0xfff6e8, 0xd8cebe, 0.5));
      const key = new T.DirectionalLight(0xffeacd, 1.9);
      key.position.copy(this._keyDir).multiplyScalar(10);
      scene.add(key);
      const fill = new T.DirectionalLight(0xe8e2f2, 0.5);
      fill.position.set(-4, 1.6, 2.4);
      scene.add(fill);
      const rim = new T.DirectionalLight(0xfff2da, 1.1);
      rim.position.set(-1.2, 3.4, -4.5);
      scene.add(rim);

      // ---------------- PMREM studio-daylight environment ---------------
      this._buildEnvironment();
      this._buildMaterials();
      this._buildComposition();
      this._buildPost();

      // ---------------- interaction / lifecycle -------------------------
      this.mouse = { x: 0, y: 0, sx: 0, sy: 0 };
      this._t = 0;
      this._visible = true;
      this._ema = 1 / 60;
      this._frames = 0;
      this._degrade = 0;

      const onMove = (e) => {
        this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
        this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
      };
      if (!this.isMobile) addEventListener('pointermove', onMove, { passive: true });
      const onResize = () => this._resize();
      addEventListener('resize', onResize);
      this._unbind = () => {
        removeEventListener('pointermove', onMove);
        removeEventListener('resize', onResize);
      };
      this._io = new IntersectionObserver((es) => { this._visible = es[0].isIntersecting; });
      this._io.observe(this);
      this._track = this.closest('[data-bloom-track]');
      this._p = 0;

      this._applyAttrs();
      this._resize();
      this._clock = new T.Clock();
      const loop = () => {
        if (this._dead) return;
        this._raf = requestAnimationFrame(loop);
        if (!this._visible || document.hidden) { this._clock.getDelta(); return; }
        this._tick();
      };
      loop();
      requestAnimationFrame(() => { renderer.domElement.style.opacity = '1'; });
    }

    _applyAttrs() {
      if (!this.T) return;
      const accent = this.getAttribute('accent') || '#C98A8E';
      const motion = parseFloat(this.getAttribute('motion') ?? '55');
      this.motionMul = (isNaN(motion) ? 55 : motion) / 55 * (this.reduceMotion ? 0.15 : 1);
      this._dofOn = this.getAttribute('dof') !== 'false';
      const parts = this.getAttribute('particles') !== 'false';
      if (this._gDust) this._gDust.visible = parts;
      if (this._gPetalsFloat) this._gPetalsFloat.visible = parts;
      if (this.matBlush) {
        const c = new this.T.Color(accent).lerp(new this.T.Color('#FFFFFF'), 0.18);
        this.matBlush.color.copy(c);
        this.matBlush.sheenColor.copy(new this.T.Color(accent).lerp(new this.T.Color('#FFF3F0'), 0.65));
      }
    }

    // ------------------------------------------------------------------
    _buildEnvironment() {
      const T = this.T;
      const env = new T.Scene();
      const sphGeo = new T.SphereGeometry(20, 24, 16);
      const [gc, gx] = canvas2d(16, 256);
      const gg = gx.createLinearGradient(0, 0, 0, 256);
      gg.addColorStop(0, '#FFF9EE'); gg.addColorStop(0.55, '#F3E9DA'); gg.addColorStop(1, '#D9CCB8');
      gx.fillStyle = gg; gx.fillRect(0, 0, 16, 256);
      const gt = new T.CanvasTexture(gc);
      gt.colorSpace = T.SRGBColorSpace;
      env.add(new T.Mesh(sphGeo, new T.MeshBasicMaterial({ map: gt, side: T.BackSide })));
      const panel = (w, h, x, y, z, col) => {
        const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: col, side: T.DoubleSide }));
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        env.add(m);
      };
      panel(9, 7, 6, 7, 4, new T.Color(3.6, 3.1, 2.5));      // warm key softbox
      panel(7, 9, -9, 3, 2, new T.Color(1.3, 1.42, 1.62));   // cool window fill
      panel(11, 2.6, 0, 5, -9, new T.Color(2.3, 2.05, 1.7)); // rim strip
      panel(14, 14, 0, -7, 0, new T.Color(0.85, 0.78, 0.66));// warm floor bounce
      const pmrem = new T.PMREMGenerator(this._renderer);
      const rt = pmrem.fromScene(env, 0.035);
      this.scene.environment = rt.texture;
      pmrem.dispose();
    }

    // fast subsurface-scattering approximation injected into physical materials
    _sss(mat, color, scale) {
      const T = this.T;
      const u = {
        uSSSLightDir: { value: this._keyDir.clone() },
        uSSSColor: { value: new T.Color(color) },
        uSSSScale: { value: scale },
      };
      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, u);
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <lights_fragment_begin>',
            `#include <lights_fragment_begin>
            {
              vec3 sssL = normalize((viewMatrix * vec4(uSSSLightDir, 0.0)).xyz);
              vec3 sssV = normalize(vViewPosition);
              float sssW = pow(clamp(dot(sssV, -(sssL + normal*0.38)), 0.0, 1.0), 2.6);
              float sssB = pow(1.0 - clamp(abs(dot(normal, sssV)), 0.0, 1.0), 2.0) * 0.35;
              reflectedLight.indirectDiffuse += uSSSColor * diffuseColor.rgb * (sssW * uSSSScale + sssB * uSSSScale * 0.6);
            }`)
          .replace('void main() {',
            `uniform vec3 uSSSLightDir; uniform vec3 uSSSColor; uniform float uSSSScale;
             void main() {`);
      };
      mat.customProgramCacheKey = () => 'bloom-sss';
      return mat;
    }

    _buildMaterials() {
      const T = this.T;
      const aniso = Math.min(8, this._renderer.capabilities.getMaxAnisotropy());
      const pm = makePetalMaps(), lm = makeLeafMaps();
      const tex = (cnv, srgb) => {
        const t = new T.CanvasTexture(cnv);
        if (srgb) t.colorSpace = T.SRGBColorSpace;
        t.anisotropy = aniso;
        t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
        return t;
      };
      this.texPetal = tex(pm.alb, true);
      this.texPetalN = tex(pm.nrm, false);
      this.texPetalR = tex(pm.rgh, false);
      this.texLeaf = tex(lm.alb, true);
      this.texLeafN = tex(lm.nrm, false);
      this.texLeafR = tex(lm.rgh, false);

      const petalMat = (color, sheen, sssCol) => this._sss(new T.MeshPhysicalMaterial({
        color, map: this.texPetal,
        normalMap: this.texPetalN, normalScale: new T.Vector2(0.55, 0.55),
        roughnessMap: this.texPetalR, roughness: 1.0, metalness: 0,
        sheen: 1.0, sheenColor: new T.Color(sheen), sheenRoughness: 0.42,
        clearcoat: 0.08, clearcoatRoughness: 0.55,
        envMapIntensity: 0.5, side: T.DoubleSide, vertexColors: true,
      }), sssCol, 0.85);

      this.matBlush = petalMat('#D9A2A0', '#FFE4E0', '#FFD3C8');
      this.matCream = petalMat('#EDDCC1', '#FFF4E2', '#FFE9CE');
      this.matIvory = petalMat('#F3ECDD', '#FFF9EE', '#FFE8D8');

      const mkLeaf = (extra) => this._sss(new T.MeshPhysicalMaterial(Object.assign({
        color: '#7E9472', map: this.texLeaf,
        normalMap: this.texLeafN, normalScale: new T.Vector2(0.5, 0.5),
        roughnessMap: this.texLeafR, roughness: 1.0, metalness: 0,
        sheen: 0.4, sheenColor: new T.Color('#D6E2C2'), sheenRoughness: 0.55,
        envMapIntensity: 0.45, side: T.DoubleSide, vertexColors: true,
      }, extra || {})), '#B8D09A', 0.55);
      this.matLeaf = mkLeaf();
      this.matLeafBg = mkLeaf({ transparent: true });
      this.matLeafFg = mkLeaf({ transparent: true });

      this.matStem = new T.MeshPhysicalMaterial({
        color: '#87997B', roughnessMap: this.texLeafR, roughness: 1.0,
        metalness: 0, sheen: 0.25, sheenColor: new T.Color('#DCE6CC'),
        sheenRoughness: 0.6, envMapIntensity: 0.4,
      });
      this.matGold = new T.MeshPhysicalMaterial({
        color: '#C9A25E', metalness: 1.0, roughness: 0.34,
        envMapIntensity: 1.6, clearcoat: 0.3, clearcoatRoughness: 0.4,
      });
      this.matLav = this._sss(new T.MeshPhysicalMaterial({
        color: '#9B93BE', roughness: 0.62, metalness: 0,
        sheen: 0.5, sheenColor: new T.Color('#D9D2EE'), sheenRoughness: 0.5,
        envMapIntensity: 0.5,
      }), '#D8CFF0', 0.5);
      this.matGyp = new T.MeshPhysicalMaterial({
        color: '#F7F3E9', roughness: 0.65, metalness: 0,
        emissive: new T.Color('#FFF6E8'), emissiveIntensity: 0.18,
        envMapIntensity: 0.5,
      });
    }

    // ------------------------------------------------------------------
    _makeBloom(opts) {
      // opts: { mat, petals, size, open, variants (geo list), animated, seed, stamens }
      const T = this.T;
      const rnd = mulberry(opts.seed);
      const group = new T.Group();
      const lists = opts.variants.map(() => []);
      const insts = [];
      const N = opts.petals;
      for (let i = 0; i < N; i++) {
        const layer = N === 1 ? 1 : i / (N - 1);
        const vi = i % opts.variants.length;
        insts.push({
          vi, ii: lists[vi].length,
          az: i * GOLD + (rnd() - 0.5) * 0.14,
          layer,
          tc: 0.09 + 0.30 * layer + (rnd() - 0.5) * 0.05,
          to: Math.min(opts.maxTilt ?? 1.14, 0.28 + 0.90 * Math.pow(layer, 0.9)) + (rnd() - 0.5) * 0.07,
          t0: 0.5 * (1 - layer),
          sc: (0.52 + 0.58 * Math.pow(layer, 0.8)) * (0.93 + rnd() * 0.14),
          roll: (rnd() - 0.5) * 0.22,
          phase: rnd() * Math.PI * 2,
        });
        lists[vi].push(i);
      }
      const meshes = opts.variants.map((geo, vi) => {
        const im = new T.InstancedMesh(geo, opts.mat, lists[vi].length);
        im.instanceMatrix.setUsage(T.DynamicDrawUsage);
        group.add(im);
        return im;
      });
      // per-petal color variation: deeper heart, paler rim
      const c = new T.Color();
      insts.forEach((p) => {
        const deep = 1 - Math.pow(p.layer, 0.7);
        c.setRGB(
          (1 - deep * 0.13) * (0.97 + rnd() * 0.06),
          (1 - deep * 0.21) * (0.97 + rnd() * 0.06),
          (1 - deep * 0.23) * (0.97 + rnd() * 0.06));
        meshes[p.vi].setColorAt(p.ii, c);
      });
      meshes.forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });

      let stamens = null, pistil = null;
      if (opts.stamens) {
        const cone = new T.ConeGeometry(0.012, 0.075, 5);
        cone.translate(0, 0.037, 0);
        stamens = new T.InstancedMesh(cone, this.matGold, 20);
        group.add(stamens);
        pistil = new T.Mesh(new T.SphereGeometry(0.030, 12, 10), this.matGold);
        pistil.scale.y = 0.6;
        group.add(pistil);
      }
      const bloom = {
        group, meshes, insts, stamens, pistil,
        size: opts.size, open: opts.open, openTarget: opts.openTarget ?? opts.open,
        delay: opts.delay ?? 0, animated: opts.animated !== false, seed: opts.seed,
      };
      this._updateBloomMatrices(bloom, 0);
      return bloom;
    }

    _updateBloomMatrices(bloom, time) {
      const T = this.T;
      const d = this._dummy || (this._dummy = new T.Object3D());
      d.rotation.order = 'YXZ';
      const s = bloom.size, open = bloom.open, mm = this.motionMul ?? 1;
      for (const p of bloom.insts) {
        const ol = smooth(clamp01((open - p.t0) / (1 - p.t0 + 1e-4)));
        let tilt = lerp(p.tc, p.to, ol);
        tilt += Math.sin(time * 0.72 + p.phase + p.layer * 1.9) * 0.016 * (0.3 + 0.7 * p.layer) * mm * open;
        const rp = s * (0.035 + 0.20 * p.layer * Math.sin(Math.min(tilt, 1.5)));
        const y0 = s * (0.10 - 0.05 * p.layer - 0.05 * ol * p.layer);
        d.position.set(Math.cos(p.az) * rp, y0, Math.sin(p.az) * rp);
        d.rotation.set(tilt, Math.PI / 2 - p.az, p.roll, 'YXZ');
        d.scale.setScalar(s * p.sc);
        d.updateMatrix();
        bloom.meshes[p.vi].setMatrixAt(p.ii, d.matrix);
      }
      bloom.meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
      if (bloom.stamens) {
        const grow = smooth(clamp01((open - 0.72) / 0.24)) * s;
        for (let i = 0; i < 20; i++) {
          const az = i * GOLD * 2.2;
          d.position.set(Math.cos(az) * 0.045 * s, 0.06 * s, Math.sin(az) * 0.045 * s);
          d.rotation.set(0.55, Math.PI / 2 - az, 0, 'YXZ');
          d.scale.setScalar(Math.max(grow, 1e-4));
          d.updateMatrix();
          bloom.stamens.setMatrixAt(i, d.matrix);
        }
        bloom.stamens.instanceMatrix.needsUpdate = true;
        bloom.pistil.position.y = 0.055 * s;
        bloom.pistil.scale.set(1, 0.6, 1).multiplyScalar(Math.max(grow * 0.9, 1e-4));
      }
    }

    _makeFlower(fd) {
      // fd: { base:V3(in cluster), tip:V3, mat, size, petals, seed, kind }
      const T = this.T;
      const g = new T.Group();
      g.position.copy(fd.base);
      const tip = fd.tip.clone().sub(fd.base);
      const lean = tip.clone().normalize();
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(0, 0, 0),
        new T.Vector3(tip.x * 0.18 + 0.04, tip.y * 0.3, tip.z * 0.18),
        new T.Vector3(tip.x * 0.62, tip.y * 0.66, tip.z * 0.62),
        tip.clone(),
      ]);
      const stem = new T.Mesh(new T.TubeGeometry(curve, 22, 0.028 * Math.sqrt(fd.size), 6), this.matStem);
      g.add(stem);
      const tipBud = new T.Mesh(new T.SphereGeometry(0.030 * Math.sqrt(fd.size), 8, 6), this.matStem);
      tipBud.visible = false;
      g.add(tipBud);

      // leaves along the stem + sepal collar (matrices driven by growth)
      const rnd = mulberry(fd.seed * 7 + 3);
      const isTulip = fd.kind === 'tulip';
      const leafCount = fd.kind === 'bud' ? 2 : isTulip ? 2 : 3;
      const sepN = isTulip ? 2 : 4;
      const leaves = new T.InstancedMesh(this._leafGeos[fd.seed % 2], this.matLeaf, leafCount + sepN);
      leaves.instanceMatrix.setUsage(T.DynamicDrawUsage);
      const leafData = [];
      for (let i = 0; i < leafCount; i++) {
        const tt = (isTulip ? 0.16 + i * 0.20 : 0.30 + i * 0.17) + rnd() * 0.06;
        leafData.push({ pos: curve.getPoint(tt), rx: (isTulip ? 0.40 : 0.9) + rnd() * (isTulip ? 0.25 : 0.5), ry: rnd() * Math.PI * 2, rz: (rnd() - 0.5) * 0.6, sc: (0.55 + rnd() * 0.35) * Math.sqrt(fd.size) * (isTulip ? 1.55 : 1), tGrow: tt });
      }
      for (let i = 0; i < sepN; i++) {
        const sp = tip.clone(); sp.y -= 0.05 * fd.size;
        leafData.push({ pos: sp, rx: 1.9 + rnd() * 0.3, ry: i * Math.PI * 2 / sepN + rnd(), rz: 0, sc: 0.30 * fd.size, tGrow: 0.93 });
      }
      g.add(leaves);

      const open0 = fd.kind === 'bud' ? 0.20 : isTulip ? 0.22 : 0.26;
      const bloom = this._makeBloom({
        mat: fd.mat, petals: isTulip ? 7 : fd.petals, size: fd.size, seed: fd.seed,
        open: open0,
        openTarget: fd.kind === 'bud' ? 0.30 : isTulip ? 0.52 : 0.80 + (fd.seed % 3) * 0.02,
        maxTilt: fd.kind === 'bud' ? 0.55 : isTulip ? 0.40 : 1.14,
        variants: fd.variants ?? this._petalGeos, delay: fd.delay ?? 0,
        stamens: fd.kind === 'main',
      });
      bloom.group.position.copy(tip);
      bloom.group.rotation.set(lean.z * 0.35 + (rnd() - 0.5) * 0.2, rnd() * Math.PI * 2, -lean.x * 0.35, 'YXZ');
      g.add(bloom.group);

      const f = {
        group: g, bloom, phase: rnd() * Math.PI * 2, swayMul: 0.8 + rnd() * 0.5,
        stem, stemIdx: stem.geometry.index.count, curve, tipBud, leaves, leafData, lastG: -1,
        bw: fd.bw || null, ow: fd.ow || null, open0,
      };
      this._applyGrowth(f, 1);
      return f;
    }

    // reveal a flower progressively: stem draws on, leaves unfurl, head pops in
    _applyGrowth(f, g) {
      if (Math.abs(g - f.lastG) < 1e-4) return;
      f.lastG = g;
      const gs = smooth(g);
      f.stem.geometry.setDrawRange(0, Math.floor(f.stemIdx * gs / 3) * 3);
      f.tipBud.visible = g > 0.01 && g < 0.97;
      if (f.tipBud.visible) f.curve.getPoint(gs, f.tipBud.position);
      const d = this._dummy || (this._dummy = new this.T.Object3D());
      d.rotation.order = 'YXZ';
      for (let i = 0; i < f.leafData.length; i++) {
        const ld = f.leafData[i];
        const lg = smooth(clamp01((gs - ld.tGrow) / 0.20));
        d.position.copy(ld.pos);
        d.rotation.set(ld.rx + (1 - lg) * 1.15, ld.ry, ld.rz, 'YXZ');
        d.scale.setScalar(Math.max(ld.sc * lg, 1e-4));
        d.updateMatrix();
        f.leaves.setMatrixAt(i, d.matrix);
      }
      f.leaves.instanceMatrix.needsUpdate = true;
      if (f.bloom) f.bloom.group.scale.setScalar(Math.max(smooth(clamp01((g - 0.86) / 0.14)), 1e-4));
    }

    // lavender spike: thin stem + spiral of instanced buds, growth-compatible
    _makeLavender(i) {
      const T = this.T;
      const rnd = mulberry(77 + i * 13);
      const g = new T.Group();
      g.position.set(-0.45 + i * 0.30 + (rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.5);
      const tip = new T.Vector3((rnd() - 0.5) * 0.55, 1.55 + rnd() * 0.35, (rnd() - 0.5) * 0.3);
      const curve = new T.CatmullRomCurve3([
        new T.Vector3(0, 0, 0),
        new T.Vector3(tip.x * 0.25, tip.y * 0.35, tip.z * 0.25),
        new T.Vector3(tip.x * 0.7, tip.y * 0.7, tip.z * 0.7),
        tip,
      ]);
      const stem = new T.Mesh(new T.TubeGeometry(curve, 16, 0.014, 5), this.matStem);
      g.add(stem);
      const tipBud = new T.Mesh(new T.SphereGeometry(0.02, 6, 5), this.matStem);
      tipBud.visible = false;
      g.add(tipBud);
      const N = 22;
      const budGeo = this._budGeo || (this._budGeo = (() => { const s = new T.SphereGeometry(0.030, 6, 5); s.scale(1, 1.35, 1); return s; })());
      const buds = new T.InstancedMesh(budGeo, this.matLav, N);
      buds.instanceMatrix.setUsage(T.DynamicDrawUsage);
      const leafData = [];
      for (let k = 0; k < N; k++) {
        const tt = 0.64 + (k / (N - 1)) * 0.36;
        const pos = curve.getPoint(Math.min(tt, 1));
        const az = k * GOLD * 2;
        pos.x += Math.cos(az) * 0.045; pos.z += Math.sin(az) * 0.045;
        leafData.push({ pos, rx: (rnd() - 0.5) * 0.6, ry: az, rz: (rnd() - 0.5) * 0.6, sc: 0.8 + rnd() * 0.4, tGrow: Math.min(tt * 0.94, 0.92) });
      }
      g.add(buds);
      const f = {
        group: g, bloom: null, phase: rnd() * Math.PI * 2, swayMul: 1.3 + rnd() * 0.5,
        stem, stemIdx: stem.geometry.index.count, curve, tipBud, leaves: buds, leafData, lastG: -1,
        bw: [0.58 + i * 0.028, 0.72 + i * 0.028], ow: null, open0: 0,
      };
      this._applyGrowth(f, 1);
      return f;
    }

    // gypsophila spray - tiny ivory dots that pop in for the finale
    _makeGyp(x, y, z, seed) {
      const T = this.T;
      const rnd = mulberry(seed);
      const g = new T.Group();
      g.position.set(x, y, z);
      const N = 26;
      const im = new T.InstancedMesh(new T.SphereGeometry(0.016, 5, 4), this.matGyp, N);
      const d = new T.Object3D();
      for (let k = 0; k < N; k++) {
        const dir = new T.Vector3(rnd() - 0.5, rnd() - 0.35, rnd() - 0.5).normalize();
        d.position.copy(dir.multiplyScalar(0.16 + rnd() * 0.42));
        d.scale.setScalar(0.7 + rnd() * 0.7);
        d.updateMatrix();
        im.setMatrixAt(k, d.matrix);
      }
      g.add(im);
      this.scene.add(g);
      return g;
    }

    _buildComposition() {
      const T = this.T;
      const mob = this.isMobile;
      // shared petal geometry variants (organic differences in curl/ruffle)
      const segW = mob ? 14 : 20, segL = mob ? 10 : 14;
      this._petalGeos = [
        petalGeometry(T, { segW, segL, curl: 0.55, cup: 0.62, ruffle: 0.026, wid: 0.50, seed: 3 }),
        petalGeometry(T, { segW, segL, curl: 0.82, cup: 0.54, ruffle: 0.034, wid: 0.54, seed: 8 }),
        petalGeometry(T, { segW, segL, curl: 1.04, cup: 0.46, ruffle: 0.040, wid: 0.50, seed: 14 }),
      ];
      this._petalGeoLow = petalGeometry(T, { segW: 10, segL: 7, curl: 1.0, cup: 0.5, ruffle: 0.03, wid: 0.52, seed: 5 });
      this._petalGeoBg = petalGeometry(T, { segW: 12, segL: 9, curl: 0.60, cup: 0.55, ruffle: 0.028, wid: 0.52, seed: 6 });
      this._leafGeos = [leafGeometry(T, 4), leafGeometry(T, 9)];

      // ============ MIDGROUND - primary cluster (right of frame) ========
      const gMid = this._gMid = new T.Group();
      gMid.position.set(2.05, -1.15, 0.1);
      this.scene.add(gMid);
      const P = mob ? 34 : 46;
      const defs = [
        { base: new T.Vector3(0.10, -2.55, 0.05), tip: new T.Vector3(-0.42, 1.30, 0.30), mat: this.matBlush, size: 1.00, petals: P, seed: 1, kind: 'main', delay: 0.5, bw: [0.04, 0.20], ow: [0.20, 0.36] },
        { base: new T.Vector3(0.45, -2.55, -0.15), tip: new T.Vector3(0.98, 0.70, -0.28), mat: this.matCream, size: 0.86, petals: P - 6, seed: 2, kind: 'main', delay: 1.3, bw: [0.07, 0.23], ow: [0.23, 0.39] },
        { base: new T.Vector3(-0.15, -2.55, -0.05), tip: new T.Vector3(-1.32, 0.26, -0.10), mat: this.matIvory, size: 0.78, petals: P - 8, seed: 3, kind: 'main', delay: 2.1, bw: [0.10, 0.26], ow: [0.26, 0.42] },
        { base: new T.Vector3(0.72, -2.55, 0.20), tip: new T.Vector3(1.66, -0.28, 0.55), mat: this.matBlush, size: 0.55, petals: 16, seed: 4, kind: 'bud', delay: 2.8, bw: [0.13, 0.29], ow: [0.29, 0.44] },
        { base: new T.Vector3(-0.42, -2.55, -0.30), tip: new T.Vector3(-1.80, -0.86, -0.45), mat: this.matCream, size: 0.50, petals: 14, seed: 5, kind: 'bud', delay: 3.4, bw: [0.16, 0.32], ow: [0.32, 0.46] },
      ];
      this._flowers = defs.map((fd) => {
        const f = this._makeFlower(fd);
        gMid.add(f.group);
        return f;
      });

      // ============ TULIP BED - chapter two (left) ======================
      const gTul = this._gTul = new T.Group();
      gTul.position.set(-2.35, -1.55, -2.05);
      this.scene.add(gTul);
      this._petalGeosTulip = [
        petalGeometry(T, { segW: 14, segL: 10, curl: 0.10, cup: 0.95, ruffle: 0.012, wid: 0.62, len: 0.95, seed: 31 }),
        petalGeometry(T, { segW: 14, segL: 10, curl: 0.16, cup: 0.88, ruffle: 0.015, wid: 0.60, len: 0.92, seed: 37 }),
      ];
      const tulDefs = [
        [-0.55, 1.10, 0.10, 0.60, this.matBlush], [-0.18, 1.28, -0.16, 0.64, this.matCream],
        [0.16, 1.16, 0.14, 0.58, this.matBlush], [0.52, 1.02, -0.06, 0.55, this.matIvory],
        [0.02, 0.92, 0.34, 0.50, this.matCream],
      ];
      tulDefs.forEach(([x, ty, z, s, mat], i) => {
        const f = this._makeFlower({
          base: new T.Vector3(x, 0, z * 0.5), tip: new T.Vector3(x * 1.25, ty, z),
          mat, size: s, petals: 7, seed: 40 + i, kind: 'tulip',
          variants: this._petalGeosTulip, delay: 1 + i * 0.6,
          bw: [0.40 + i * 0.022, 0.54 + i * 0.022], ow: [0.50 + i * 0.022, 0.63 + i * 0.022],
        });
        gTul.add(f.group);
        this._flowers.push(f);
      });

      // ============ LAVENDER BED - chapter three (center back) ==========
      const gLav = this._gLav = new T.Group();
      gLav.position.set(-0.75, -0.95, -2.7);
      this.scene.add(gLav);
      for (let i = 0; i < 4; i++) {
        const f = this._makeLavender(i);
        gLav.add(f.group);
        this._flowers.push(f);
      }

      // ============ GYPSOPHILA - wedding fullness for the finale ========
      this._gyps = [
        this._makeGyp(0.95, 0.62, 0.55, 61),
        this._makeGyp(2.62, -0.18, 0.5, 67),
        this._makeGyp(1.45, -0.95, -0.55, 71),
      ];

      // ============ FOREGROUND - close, heavily out of focus ============
      const gFore = this._gFore = new T.Group();
      this.scene.add(gFore);
      const fgBloom = this._makeBloom({
        mat: this.matBlush, petals: 30, size: 1.15, seed: 11,
        open: 0.9, openTarget: 0.9, variants: [this._petalGeos[1], this._petalGeos[2]],
        stamens: false,
      });
      fgBloom.group.position.set(-1.58, -1.24, 4.9);
      fgBloom.group.rotation.set(0.75, 0.3, 0.25);
      gFore.add(fgBloom.group);
      this._fgBloom = fgBloom;
      const fgLeaves = new T.InstancedMesh(this._leafGeos[0], this.matLeafFg, 3);
      const d = new T.Object3D(); d.rotation.order = 'YXZ';
      for (let i = 0; i < 3; i++) {
        d.position.set(1.74 + i * 0.14, 1.20 - i * 0.07, 4.15);
        d.rotation.set(2.4 + i * 0.25, 0.7 + i * 0.9, 0.3, 'YXZ');
        d.scale.setScalar(1.05 - i * 0.18);
        d.updateMatrix();
        fgLeaves.setMatrixAt(i, d.matrix);
      }
      gFore.add(fgLeaves);

      // ============ BACKGROUND - soft out-of-focus garden ===============
      const gBack = this._gBack = new T.Group();
      this.scene.add(gBack);
      const bgSpots = [
        [0.5, 2.4, -5.2, 0.9, this.matIvory], [1.8, 2.1, -5.6, 1.1, this.matCream],
        [3.7, 1.2, -5.0, 1.0, this.matBlush], [4.8, -0.5, -5.8, 1.2, this.matIvory],
        [2.5, -1.4, -4.4, 0.8, this.matCream], [5.5, 2.2, -6.4, 1.0, this.matBlush],
      ];
      this._bgBlooms = [];
      bgSpots.forEach(([x, y, z, s, mat], k) => {
        const b = this._makeBloom({
          mat, petals: 22, size: s, seed: 20 + k,
          open: 0.60 + (k % 3) * 0.05, maxTilt: 0.95,
          variants: [this._petalGeoBg], stamens: false, animated: false,
        });
        b.group.position.set(x, y, z);
        b.group.rotation.set(0.35 + (k % 3) * 0.2, k * 1.7, 0);
        gBack.add(b.group);
        this._bgBlooms.push(b.group);
      });
      const bgLeaves = new T.InstancedMesh(this._leafGeos[1], this.matLeafBg, 16);
      const rnd = mulberry(31);
      for (let i = 0; i < 16; i++) {
        d.position.set(-0.5 + rnd() * 7, -2 + rnd() * 5, -6.5 + rnd() * 2.2);
        d.rotation.set(rnd() * 2, rnd() * 6.28, rnd() * 2, 'YXZ');
        d.scale.setScalar(1.1 + rnd() * 1.3);
        d.updateMatrix();
        bgLeaves.setMatrixAt(i, d.matrix);
      }
      gBack.add(bgLeaves);

      // ============ floating petals ======================================
      const NP = mob ? 8 : 14;
      const gPF = this._gPetalsFloat = new T.Group();
      this.scene.add(gPF);
      this._floatMesh = new T.InstancedMesh(this._petalGeoBg, this.matBlush, NP);
      this._floatMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      gPF.add(this._floatMesh);
      const frnd = mulberry(41);
      this._floaters = Array.from({ length: NP }, () => ({
        x: -2.2 + frnd() * 6.5, y: -2.5 + frnd() * 5.4, z: -3 + frnd() * 5.5,
        vy: 0.055 + frnd() * 0.05, ph: frnd() * 6.28, rs: 0.25 + frnd() * 0.4,
        sc: 0.12 + frnd() * 0.10,
      }));

      // ============ dust motes + gold shimmer ============================
      const gDust = this._gDust = new T.Group();
      this.scene.add(gDust);
      const spriteTex = new T.CanvasTexture(makeSoftSprite(64, 1));
      const dustGeo = (n, box) => {
        const pos = new Float32Array(n * 3);
        const r2 = mulberry(51 + n);
        for (let i = 0; i < n; i++) {
          pos[i * 3] = box[0] + r2() * box[1];
          pos[i * 3 + 1] = box[2] + r2() * box[3];
          pos[i * 3 + 2] = box[4] + r2() * box[5];
        }
        const g2 = new T.BufferGeometry();
        g2.setAttribute('position', new T.BufferAttribute(pos, 3));
        return g2;
      };
      this._dustA = new T.Points(dustGeo(mob ? 50 : 110, [-4, 9, -2.6, 5.6, -6, 10]),
        new T.PointsMaterial({ map: spriteTex, color: 0xfff8ec, size: 0.055, transparent: true, opacity: 0.30, depthWrite: false, sizeAttenuation: true }));
      this._dustB = new T.Points(dustGeo(mob ? 14 : 28, [-2, 7, -2, 4.6, -4, 7]),
        new T.PointsMaterial({ map: spriteTex, color: 0xd9b678, size: 0.075, transparent: true, opacity: 0.4, depthWrite: false, sizeAttenuation: true }));
      gDust.add(this._dustA, this._dustB);

      // ============ low volumetric mist ==================================
      const mistTex = new T.CanvasTexture(makeSoftSprite(256, 0.8));
      this._mists = [];
      for (let i = 0; i < 3; i++) {
        const m = new T.Mesh(new T.PlaneGeometry(7.5, 2.6),
          new T.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0.055, depthWrite: false, fog: false }));
        m.position.set(-1.5 + i * 2.4, -1.55 - i * 0.28, 1.4 + i * 0.9);
        m.userData.ph = i * 2.1;
        this.scene.add(m);
        this._mists.push(m);
      }
    }

    // ------------------------------------------------------------------
    _buildPost() {
      const T = this.T;
      const mkRT = (w, h, depth) => {
        const rt = new T.WebGLRenderTarget(w, h, {
          type: this._hdrType, minFilter: T.LinearFilter, magFilter: T.LinearFilter,
          depthBuffer: !!depth, stencilBuffer: false,
        });
        if (depth && this._canDepth) {
          rt.depthTexture = new T.DepthTexture(w, h);
        }
        return rt;
      };
      this._sceneRT = mkRT(8, 8, true);
      this._brightRT = mkRT(8, 8, false);
      this._blurA = mkRT(8, 8, false);
      this._blurB = mkRT(8, 8, false);

      const quadGeo = new T.BufferGeometry();
      quadGeo.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
      this._quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this._quadScene = new T.Scene();
      this._quad = new T.Mesh(quadGeo, null);
      this._quad.frustumCulled = false;
      this._quadScene.add(this._quad);

      this._matBright = new T.ShaderMaterial({
        vertexShader: FSQ_VERT, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false,
        uniforms: { tSrc: { value: null }, uTh: { value: 0.78 }, uKnee: { value: 0.45 } },
      });
      this._matBlur = new T.ShaderMaterial({
        vertexShader: FSQ_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false,
        uniforms: { tSrc: { value: null }, uDir: { value: new T.Vector2(1, 0) }, uTexel: { value: new T.Vector2(1, 1) } },
      });
      this._matComp = new T.ShaderMaterial({
        vertexShader: FSQ_VERT, fragmentShader: COMP_FRAG, depthTest: false, depthWrite: false,
        uniforms: {
          tScene: { value: null }, tBloom: { value: null }, tDepth: { value: null },
          uRes: { value: new T.Vector2(8, 8) }, uNear: { value: 0.1 }, uFar: { value: 40 },
          uFocus: { value: 7.2 }, uDofAmt: { value: 1 }, uMaxCoc: { value: 0.026 },
          uBloomStr: { value: 0.75 }, uExposure: { value: 1.16 }, uTime: { value: 0 },
          uGrain: { value: 0.015 }, uVig: { value: 0.11 },
        },
      });
      this._focusPoint = new T.Vector3(1.7, 0.45, 0.05);
    }

    _resize() {
      if (!this._renderer) return;
      const w = this.clientWidth || innerWidth, h = this.clientHeight || innerHeight;
      this._renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      const db = this._renderer.getDrawingBufferSize(new this.T.Vector2());
      const sw = Math.round(db.x * this._ssaa), sh = Math.round(db.y * this._ssaa);
      this._sceneRT.setSize(sw, sh);
      if (this._sceneRT.depthTexture) {
        this._sceneRT.depthTexture.image.width = sw;
        this._sceneRT.depthTexture.image.height = sh;
      }
      const bw = Math.max(8, sw >> 1), bh = Math.max(8, sh >> 1);
      this._brightRT.setSize(bw, bh);
      this._blurA.setSize(bw, bh);
      this._blurB.setSize(bw, bh);
      this._matComp.uniforms.uRes.value.set(sw, sh);
      this._matBlur.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    }

    _adapt(dt) {
      this._ema = lerp(this._ema, dt, 0.04);
      if (++this._frames % 180 !== 0) return;
      if (this._ema > 0.023 && this._degrade < 3) {
        this._degrade++;
        if (this._degrade === 1 && this._ssaa > 1) { this._ssaa = 1.0; this._resize(); }
        else if (this._degrade === 1 || this._degrade === 2) {
          this._pr = Math.max(1, this._pr - 0.35);
          this._renderer.setPixelRatio(this._pr);
          this._resize();
        } else {
          this._matComp.uniforms.uDofAmt.value = 0;
        }
      }
    }

    // continuous camera journey - Catmull-Rom splines, no per-segment stops
    _evalPath(p) {
      const T = this.T;
      if (!this._camCurve) {
        const mk = (arr) => new T.CatmullRomCurve3(arr.map((a) => new T.Vector3(a[0], a[1], a[2])), false, 'centripetal');
        this._camCurve = mk(BloomHeroV2.PATH.pos);
        this._lookCurve = mk(BloomHeroV2.PATH.look);
        this._focusCurve = mk(BloomHeroV2.PATH.focus);
        this._pathTmp = { pos: new T.Vector3(), look: new T.Vector3(), focus: new T.Vector3() };
      }
      const u = clamp01(p);
      const o = this._pathTmp;
      this._camCurve.getPoint(u, o.pos);
      this._lookCurve.getPoint(u, o.look);
      this._focusCurve.getPoint(u, o.focus);
      return o;
    }

    // ------------------------------------------------------------------
    _tick() {
      const T = this.T;
      const dt = Math.min(this._clock.getDelta(), 0.05);
      this._t += dt;
      const t = this._t, mm = this.motionMul ?? 1;
      this._adapt(dt);

      // mouse smoothing
      this.mouse.sx = lerp(this.mouse.sx, this.mouse.x, 1 - Math.pow(0.0018, dt));
      this.mouse.sy = lerp(this.mouse.sy, this.mouse.y, 1 - Math.pow(0.0018, dt));
      const mx = this.mouse.sx, my = this.mouse.sy;

      // --- scroll journey progress (when inside a [data-bloom-track]) --
      let path = null;
      if (this._track) {
        const r = this._track.getBoundingClientRect();
        const total = r.height - innerHeight;
        const raw = total > 0 ? clamp01(-r.top / total) : 0;
        if (this._pInit === undefined) { this._pInit = true; this._p = raw; }
        this._p = lerp(this._p, raw, 1 - Math.pow(0.001, dt));
        path = this._evalPath(this._p);
      }

      // --- camera: journey (scroll) or slow drift (ambient) + parallax --
      const cam = this.camera;
      const lk = this._lookTmp || (this._lookTmp = new T.Vector3());
      if (path) {
        cam.position.set(
          path.pos.x + Math.sin(t * 0.10) * 0.045 * mm + mx * 0.17,
          path.pos.y + Math.cos(t * 0.083) * 0.035 * mm - my * 0.10,
          path.pos.z + Math.sin(t * 0.031) * 0.05 * mm);
        lk.copy(path.look);
        lk.x += mx * 0.08; lk.y -= my * 0.05;
        cam.lookAt(lk);
      } else {
        cam.position.set(
          this._camBase.x + (Math.sin(t * 0.10) * 0.13 + Math.sin(t * 0.043) * 0.07) * mm + mx * 0.26,
          this._camBase.y + Math.cos(t * 0.083) * 0.08 * mm - my * 0.14,
          this._camBase.z + Math.sin(t * 0.031) * 0.22 * mm);
        lk.copy(this._lookBase);
        lk.x += mx * 0.10; lk.y -= my * 0.06;
        cam.lookAt(lk);
      }

      // --- construction timeline: the garden assembles chapter by chapter
      const sp = this._p;
      const bf = path ? smooth(clamp01((sp - 0.72) / 0.16)) : 1;    // background garden fills in
      const ff = path ? smooth(clamp01((sp - 0.86) / 0.10)) : 1;    // foreground depth arrives
      const pf = path ? Math.max(smooth(clamp01((0.14 - sp) / 0.10)), smooth(clamp01((sp - 0.74) / 0.16)), 0.30) : 1; // petals: intro rain -> finale
      const gd = path ? smooth(clamp01((sp - 0.78) / 0.12)) : 1;    // gold dust
      const gf = path ? clamp01((sp - 0.80) / 0.10) : 1;            // gypsophila pops

      for (let i = 0; i < this._flowers.length; i++) {
        const f = this._flowers[i], b = f.bloom;
        if (path && f.bw) this._applyGrowth(f, clamp01((sp - f.bw[0]) / (f.bw[1] - f.bw[0])));
        f.group.rotation.z = (Math.sin(t * 0.31 + f.phase) * 0.011 + Math.sin(t * 0.53 + f.phase * 1.7) * 0.006) * mm * f.swayMul - mx * 0.016;
        f.group.rotation.x = Math.sin(t * 0.24 + f.phase * 2.3) * 0.007 * mm * f.swayMul + my * 0.011;
        if (!b) continue;
        let e;
        if (path && f.ow) e = smooth(clamp01((sp - f.ow[0]) / (f.ow[1] - f.ow[0])));
        else e = this.reduceMotion ? 1 : smooth(clamp01((t - (b.delay || 0)) / 7.0));
        const breathe = Math.sin(t * (2 * Math.PI / 8.5) + f.phase) * 0.012 * mm;
        b.open = lerp(f.open0 ?? 0.26, b.openTarget, e) + breathe * (0.3 + 0.7 * e);
        if (b.animated) this._updateBloomMatrices(b, t);
      }
      this._gMid.rotation.y = mx * 0.012;

      // world assembling: background blooms pop from their centers, leaves fade
      for (let k = 0; k < this._bgBlooms.length; k++) {
        const s = smooth(clamp01((bf - k * 0.05) / 0.75));
        this._bgBlooms[k].scale.setScalar(Math.max(s, 1e-4));
      }
      this.matLeafBg.opacity = bf;
      this.matLeafFg.opacity = ff;
      this._fgBloom.group.scale.setScalar(Math.max(ff, 1e-4));
      this._floatRamp = pf;
      this._dustB.material.opacity = 0.4 * gd;
      for (let k = 0; k < this._gyps.length; k++) {
        const s = smooth(clamp01((gf - k * 0.05) / 0.85));
        this._gyps[k].scale.setScalar(Math.max(s, 1e-4));
      }

      // foreground bloom: slow breathing only
      this._fgBloom.open = 0.9 + Math.sin(t * 0.6) * 0.012 * mm;
      if ((this._frames & 3) === 0) this._updateBloomMatrices(this._fgBloom, t);
      this._gFore.position.x = mx * 0.10;
      this._gFore.position.y = -my * 0.055;
      this._gBack.position.x = -mx * 0.16;
      this._gBack.position.y = my * 0.09;

      // floating petals
      const d = this._dummy || (this._dummy = new T.Object3D());
      for (let i = 0; i < this._floaters.length; i++) {
        const p = this._floaters[i];
        p.y -= p.vy * dt * mm * 1.6;
        if (p.y < -2.8) { p.y = 3.0; p.x = -2.2 + Math.random() * 6.5; }
        d.position.set(p.x + Math.sin(t * 0.5 + p.ph) * 0.35, p.y, p.z);
        d.rotation.set(t * p.rs + p.ph, t * p.rs * 0.7, p.ph, 'XYZ');
        d.scale.setScalar(p.sc * Math.max(this._floatRamp ?? 1, 1e-4));
        d.updateMatrix();
        this._floatMesh.setMatrixAt(i, d.matrix);
      }
      this._floatMesh.instanceMatrix.needsUpdate = true;

      // dust + mist drift
      this._gDust.rotation.y = Math.sin(t * 0.02) * 0.04;
      this._gDust.position.y = Math.sin(t * 0.11) * 0.10 * mm;
      this._gDust.position.x = mx * 0.12;
      for (const m of this._mists) {
        m.position.x += Math.sin(t * 0.05 + m.userData.ph) * 0.0006 * mm;
        m.material.opacity = 0.05 + Math.sin(t * 0.13 + m.userData.ph) * 0.014;
      }

      // --- render pipeline ---------------------------------------------
      const R = this._renderer;
      R.setRenderTarget(this._sceneRT);
      R.render(this.scene, cam);

      // bloom chain
      this._quad.material = this._matBright;
      this._matBright.uniforms.tSrc.value = this._sceneRT.texture;
      R.setRenderTarget(this._brightRT);
      R.render(this._quadScene, this._quadCam);
      let src = this._brightRT;
      for (let i = 0; i < 2; i++) {
        this._quad.material = this._matBlur;
        this._matBlur.uniforms.tSrc.value = src.texture;
        this._matBlur.uniforms.uDir.value.set(1, 0);
        R.setRenderTarget(this._blurA);
        R.render(this._quadScene, this._quadCam);
        this._matBlur.uniforms.tSrc.value = this._blurA.texture;
        this._matBlur.uniforms.uDir.value.set(0, 1);
        R.setRenderTarget(this._blurB);
        R.render(this._quadScene, this._quadCam);
        src = this._blurB;
      }

      // composite: DoF + bloom + ACES + grade + grain
      const u = this._matComp.uniforms;
      u.tScene.value = this._sceneRT.texture;
      u.tBloom.value = this._blurB.texture;
      u.tDepth.value = this._sceneRT.depthTexture || null;
      u.uNear.value = cam.near; u.uFar.value = cam.far;
      u.uFocus.value = cam.position.distanceTo(path ? path.focus : this._focusPoint);
      u.uDofAmt.value = (this._dofOn && this._sceneRT.depthTexture && this._degrade < 3) ? (this.isMobile ? 0.55 : 1) : 0;
      u.uTime.value = t;
      this._quad.material = this._matComp;
      R.setRenderTarget(null);
      R.render(this._quadScene, this._quadCam);
    }
  }

  // camera / look / focus keyframes, uniformly spaced along scroll.
  // Chaptered sweep: mist intro -> rose bed grows & opens (orbit) -> travel left
  // to the tulip bed -> through the gap to lavender -> wide reveal with
  // gypsophila popping in -> settle into the final hero frame.
  BloomHeroV2.PATH = {
    pos: [[0.60, -1.60, 8.60], [1.20, -1.80, 6.20], [1.70, -1.15, 5.20], [3.00, 0.50, 4.40], [1.90, 1.10, 4.90], [-0.60, 0.15, 4.60], [-2.10, -0.50, 1.40], [-1.70, 0.10, 1.60], [-0.20, 0.45, 2.60], [-0.50, 0.85, 6.00], [0.00, 0.28, 7.40]],
    look: [[1.40, -1.00, 0.0], [1.90, -1.35, 0.0], [1.85, -0.50, 0.10], [1.63, 0.15, 0.35], [1.50, 0.20, 0.10], [-1.30, -0.75, -1.60], [-2.35, -1.05, -2.05], [-0.80, -0.35, -2.60], [-0.70, -0.30, -2.70], [0.70, 0.10, -0.40], [0.55, 0.22, 0.0]],
    focus: [[1.90, -1.40, 0.10], [1.90, -1.35, 0.0], [1.85, -0.50, 0.10], [1.63, 0.15, 0.38], [1.50, 0.20, 0.10], [-2.35, -1.00, -2.00], [-2.35, -1.00, -2.00], [-0.80, -0.45, -2.65], [-0.75, -0.40, -2.70], [1.20, 0.20, 0.0], [1.70, 0.45, 0.05]],
  };

  customElements.define('bloom-hero-v2', BloomHeroV2);
})();
