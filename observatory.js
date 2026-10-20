/* Espresso Observatory. A wireframe cup, handle and saucer in three.js, steam
   strands that turn into data nodes as they rise, a few droplets, and a pointer
   field that nudges nearby steam. Progressive: the page never waits for this
   file, the poster stays if WebGL is missing, and nothing here touches content. */

import * as THREE from './assets/vendor/three/three.module.min.js';


function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function init(slot) {
  const small = matchMedia('(max-width: 60rem)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COPPER = new THREE.Color('#8c4c24');
  const IVORY = new THREE.Color('#f4f0e8');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  const DPR = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  slot.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(IVORY, 6.2, 10.8);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const target = new THREE.Vector3(0, 1.15, 0);
  camera.position.set(4.1, 3.35, 5.1);
  camera.lookAt(target);

  const sculpture = new THREE.Group();
  scene.add(sculpture);

  /* ---------- geometry: rings and meridians, no triangle diagonals ---------- */
  const lineMat = new THREE.LineBasicMaterial({ color: COPPER, transparent: true, opacity: 0.92 });
  const ghostMat = new THREE.LineBasicMaterial({ color: COPPER, transparent: true, opacity: 0.13, depthTest: false, depthWrite: false });
  const occluderMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });

  function sampleProfile(ctrl, n) {
    const curve = new THREE.CatmullRomCurve3(ctrl.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
    return curve.getSpacedPoints(n).map(p => ({ r: Math.max(0, p.x), y: p.y }));
  }
  function latheLines(profile, radial, ringEvery, meridianEvery, minR) {
    const out = [];
    const P = (i, k) => { const p = profile[i]; const a = (k / radial) * Math.PI * 2; return [Math.cos(a) * p.r, p.y, Math.sin(a) * p.r]; };
    let apex = 0;
    for (let i = 1; i < profile.length; i++) if (profile[i].y > profile[apex].y) apex = i;
    for (let i = 0; i < profile.length; i++) {
      if (i % ringEvery !== 0 && i !== apex) continue;
      if (profile[i].r < 0.04) continue;
      for (let k = 0; k < radial; k++) out.push(...P(i, k), ...P(i, k + 1));
    }
    for (let k = 0; k < radial; k += meridianEvery) {
      for (let i = 0; i < profile.length - 1; i++) {
        if (profile[i].r < minR && profile[i + 1].r < minR) continue;
        out.push(...P(i, k), ...P(i + 1, k));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(out), 3));
    return g;
  }
  function addWire(geometry, occluder) {
    sculpture.add(new THREE.LineSegments(geometry, lineMat));
    const ghost = new THREE.LineSegments(geometry, ghostMat); ghost.renderOrder = 2; sculpture.add(ghost);
    if (occluder) { occluder.renderOrder = -1; sculpture.add(occluder); }
  }

  // cup: outer wall up to the rim, over the lip, inner wall down to the floor
  const cupCtrl = [[0, 0], [0.48, 0], [0.6, 0.02], [0.64, 0.08], [0.7, 0.32], [0.79, 0.68], [0.88, 1.05], [0.94, 1.32], [0.95, 1.41], [0.93, 1.44], [0.9, 1.41], [0.88, 1.27], [0.8, 0.95], [0.69, 0.56], [0.58, 0.24], [0.44, 0.16], [0, 0.15]];
  const cupProfile = sampleProfile(cupCtrl, small ? 28 : 36);
  const RADIAL = small ? 36 : 48;
  addWire(latheLines(cupProfile, RADIAL, 2, 2, 0.3), new THREE.Mesh(new THREE.LatheGeometry(cupProfile.map(p => new THREE.Vector2(p.r, p.y)), RADIAL), occluderMat));

  // saucer: a shallow dish with a lip, sitting just under the cup
  const saucerCtrl = [[0, -0.02], [0.42, -0.02], [0.58, 0], [0.8, 0.03], [1.02, 0.07], [1.24, 0.13], [1.4, 0.19], [1.5, 0.23], [1.52, 0.2], [1.44, 0.17], [1.26, 0.11], [1.05, 0.06], [0.82, 0.03], [0.58, -0.01], [0.42, -0.03], [0, -0.03]];
  const saucerProfile = sampleProfile(saucerCtrl, small ? 24 : 30);
  addWire(latheLines(saucerProfile, RADIAL, 3, 3, 0.5), new THREE.Mesh(new THREE.LatheGeometry(saucerProfile.map(p => new THREE.Vector2(p.r, p.y)), RADIAL), occluderMat));
  const saucerTop = saucerProfile.slice(0, saucerProfile.findIndex(p => p.r >= 1.5) + 1);
  function saucerY(r) {
    for (let i = 1; i < saucerTop.length; i++) {
      if (saucerTop[i].r >= r) { const a = saucerTop[i - 1], b = saucerTop[i]; const u = (r - a.r) / Math.max(1e-6, b.r - a.r); return a.y + (b.y - a.y) * u; }
    }
    return saucerTop[saucerTop.length - 1].y;
  }

  // handle: a curved tube, drawn as rings every few steps plus long lines
  const handlePath = new THREE.CatmullRomCurve3([[0.82, 1.2, 0], [1.16, 1.22, 0], [1.42, 1.04, 0], [1.48, 0.78, 0], [1.36, 0.54, 0], [1.02, 0.42, 0], [0.7, 0.44, 0]].map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const TUBE_T = 28, TUBE_R = 10;
  const tube = new THREE.TubeGeometry(handlePath, TUBE_T, 0.085, TUBE_R, false);
  {
    const pos = tube.attributes.position, out = [];
    const V = (i, j) => [pos.getX(i * (TUBE_R + 1) + j), pos.getY(i * (TUBE_R + 1) + j), pos.getZ(i * (TUBE_R + 1) + j)];
    for (let i = 0; i <= TUBE_T; i += 2) for (let j = 0; j < TUBE_R; j++) out.push(...V(i, j), ...V(i, j + 1));
    for (let j = 0; j < TUBE_R; j += 2) for (let i = 0; i < TUBE_T; i++) out.push(...V(i, j), ...V(i + 1, j));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(out), 3));
    addWire(g, new THREE.Mesh(tube, occluderMat));
  }

  // a soft ground shadow so the sculpture sits on something
  {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(48,41,31,0.20)'); grad.addColorStop(0.55, 'rgba(48,41,31,0.07)'); grad.addColorStop(1, 'rgba(48,41,31,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.05; shadow.renderOrder = -2;
    sculpture.add(shadow);
  }

  /* ---------- steam: strands in world space, anchored inside the cup opening ---------- */
  const RIM_Y = 1.42;
  const N_STRANDS = small ? 4 : 6, N_PTS = 44, N_NODES = small ? 3 : 5;
  const rnd = mulberry32(11);
  const strands = [];
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tint = new THREE.Color();
  const strandMat = new THREE.LineBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.85 });
  for (let s = 0; s < N_STRANDS; s++) {
    const a = rnd() * Math.PI * 2, r = 0.12 + rnd() * 0.4;
    const st = {
      x0: Math.cos(a) * r, z0: Math.sin(a) * r, height: 1.0 + rnd() * 0.35, phase: rnd() * Math.PI * 2, speed: 0.35 + rnd() * 0.25,
      amp1: 0.18 + rnd() * 0.14, amp2: 0.06 + rnd() * 0.05, freq: 0.9 + rnd() * 0.6,
      dirX: Math.cos(a + Math.PI / 2), dirZ: Math.sin(a + Math.PI / 2), leanX: (rnd() - 0.5) * 0.4, leanZ: (rnd() - 0.5) * 0.4,
      pos: new Float32Array(N_PTS * 3), off: new Float32Array(N_PTS * 3), nodes: []
    };
    const col = new Float32Array(N_PTS * 3);
    for (let i = 0; i < N_PTS; i++) { const t = i / (N_PTS - 1); tint.copy(COPPER).lerp(IVORY, smooth(0.25, 1, t)); col[i * 3] = tint.r; col[i * 3 + 1] = tint.g; col[i * 3 + 2] = tint.b; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(st.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    st.line = new THREE.Line(g, strandMat);
    st.line.frustumCulled = false;
    scene.add(st.line);
    for (let n = 0; n < N_NODES; n++) st.nodes.push({ t: (n + rnd() * 0.8) / N_NODES, speed: 0.06 + rnd() * 0.04 });
    strands.push(st);
  }
  function strandPoint(s, t, time, out) {
    const spread = 1 + t * 0.6;
    const sway = Math.sin(t * 3.1 * s.freq - time * s.speed + s.phase) * s.amp1 * t + Math.sin(t * 7.3 - time * s.speed * 1.6 + s.phase * 2.1) * s.amp2 * t * t;
    out.x = s.x0 * spread + sway * s.dirX + s.leanX * t * t;
    out.y = RIM_Y + 0.02 + t * s.height;
    out.z = s.z0 * spread + sway * s.dirZ + s.leanZ * t * t;
    return out;
  }

  /* ---------- points: steam particles that become data nodes, droplets, marks ---------- */
  const N_DROPS = 3;
  const CAP = N_STRANDS * N_NODES + N_DROPS * 2;
  const pPos = new Float32Array(CAP * 3), pSize = new Float32Array(CAP), pAlpha = new Float32Array(CAP), pKind = new Float32Array(CAP);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('aKind', new THREE.BufferAttribute(pKind, 1).setUsage(THREE.DynamicDrawUsage));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 300 }, uColor: { value: COPPER.clone() } },
    vertexShader: `
      attribute float aSize; attribute float aAlpha; attribute float aKind;
      varying float vAlpha; varying float vKind;
      uniform float uScale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, aSize * uScale / -mv.z);
        gl_Position = projectionMatrix * mv;
        vAlpha = aAlpha; vKind = aKind;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha; varying float vKind;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float disc = smoothstep(0.5, 0.38, d);
        float m = max(abs(c.x), abs(c.y));
        float square = smoothstep(0.46, 0.40, m) - smoothstep(0.30, 0.24, m);
        float a = mix(disc, square, vKind) * vAlpha;
        if (a < 0.02) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false; points.renderOrder = 3;
  scene.add(points);

  // faint links between nodes near the top of the steam
  const LINK_CAP = 48;
  const lPos = new Float32Array(LINK_CAP * 6);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage));
  const links = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: COPPER, transparent: true, opacity: 0.32 }));
  links.frustumCulled = false;
  scene.add(links);

  /* ---------- droplets: condensation at the rim, falling to the saucer ---------- */
  const drops = [];
  const ripples = [];
  const circle = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; circle.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }
  for (let d = 0; d < N_DROPS; d++) {
    drops.push({ phase: 'wait', t: 0, wait: 2 + d * 2.6 + rnd() * 2, angle: rnd() * Math.PI * 2, y: 0, r: 1.0, dx: 0, dz: 0 });
    const m = new THREE.LineBasicMaterial({ color: COPPER, transparent: true, opacity: 0 });
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle), m);
    ring.visible = false; ring.renderOrder = 1;
    sculpture.add(ring);
    ripples.push({ mesh: ring, t: 1, mark: { t: 1, x: 0, y: 0, z: 0 } });
  }

  /* ---------- pointer field ---------- */
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const ndc = new THREE.Vector2();
  const pointer = new THREE.Vector3();
  let pointerActive = false;
  const FIELD_R = 0.95, FIELD_STR = 0.34;
  function updatePointer(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    camera.getWorldDirection(tmp2);
    plane.setFromNormalAndCoplanarPoint(tmp2, target);
    pointerActive = !!raycaster.ray.intersectPlane(plane, pointer);
  }
  function push(x, y, z, out) {
    const dx = x - pointer.x, dy = (y - pointer.y) * 0.6, dz = z - pointer.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!pointerActive || dist >= FIELD_R || dist < 1e-4) { out[0] = out[1] = out[2] = 0; return; }
    const f = (1 - dist / FIELD_R); const k = f * f * FIELD_STR / dist;
    out[0] = dx * k; out[1] = dy * k * 0.5; out[2] = dz * k;
  }
  const pushOut = [0, 0, 0];

  /* ---------- rotation and drag ---------- */
  const AUTO = (Math.PI * 2) / 38;
  let rotY = 0.45, tiltX = 0, autoFactor = 1, dragging = false, lastX = 0, lastY = 0, dragVel = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY; dragVel = 0; autoFactor = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
  });
  canvas.addEventListener('pointermove', (e) => {
    updatePointer(e);
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    rotY += dx * 0.008; dragVel = dx * 0.008;
    tiltX = clamp(tiltX + dy * 0.003, -0.22, 0.18);
    if (!running) renderStill();
  });
  const endDrag = (e) => { if (!dragging) return; dragging = false; try { canvas.releasePointerCapture(e.pointerId); } catch (x) {} };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerenter', updatePointer);
  canvas.addEventListener('pointerleave', () => { pointerActive = false; });

  /* ---------- per-frame update ---------- */
  let time = 3.7;
  function update(dt) {
    const ease = 1 - Math.exp(-dt * 6);
    if (!dragging) {
      autoFactor += (1 - autoFactor) * (1 - Math.exp(-dt * 1.1));
      dragVel *= Math.exp(-dt * 3.5); rotY += dragVel;
      tiltX += (0 - tiltX) * (1 - Math.exp(-dt * 1.4));
    }
    rotY += AUTO * autoFactor * dt;
    sculpture.rotation.set(tiltX, rotY, 0);
    sculpture.updateMatrixWorld();

    // strands
    let pi = 0;
    for (const s of strands) {
      for (let i = 0; i < N_PTS; i++) {
        const t = i / (N_PTS - 1);
        strandPoint(s, t, time, tmp);
        push(tmp.x, tmp.y, tmp.z, pushOut);
        const o = i * 3;
        s.off[o] += (pushOut[0] - s.off[o]) * ease; s.off[o + 1] += (pushOut[1] - s.off[o + 1]) * ease; s.off[o + 2] += (pushOut[2] - s.off[o + 2]) * ease;
        s.pos[o] = tmp.x + s.off[o]; s.pos[o + 1] = tmp.y + s.off[o + 1]; s.pos[o + 2] = tmp.z + s.off[o + 2];
      }
      s.line.geometry.attributes.position.needsUpdate = true;
      // nodes ride the strand and turn from soft particles into square data marks
      for (const n of s.nodes) {
        n.t += dt * n.speed; if (n.t > 1) { n.t -= 1; n.speed = 0.06 + Math.random() * 0.04; }
        const t = n.t, fi = t * (N_PTS - 1), i0 = Math.floor(fi), i1 = Math.min(N_PTS - 1, i0 + 1), fu = fi - i0;
        const o = pi * 3, a0 = i0 * 3, a1 = i1 * 3;
        pPos[o] = s.pos[a0] + (s.pos[a1] - s.pos[a0]) * fu;
        pPos[o + 1] = s.pos[a0 + 1] + (s.pos[a1 + 1] - s.pos[a0 + 1]) * fu;
        pPos[o + 2] = s.pos[a0 + 2] + (s.pos[a1 + 2] - s.pos[a0 + 2]) * fu;
        pSize[pi] = 0.028 + t * 0.06;
        pAlpha[pi] = smooth(0, 0.08, t) * (1 - smooth(0.86, 1, t)) * (0.55 + 0.45 * t);
        pKind[pi] = smooth(0.42, 0.72, t);
        pi++;
      }
    }
    // links between high nodes on different strands
    let li = 0;
    const nodeCount = N_STRANDS * N_NODES;
    for (let a = 0; a < nodeCount && li < LINK_CAP; a++) {
      if (pKind[a] < 0.5) continue;
      for (let b = a + 1; b < nodeCount && li < LINK_CAP; b++) {
        if (pKind[b] < 0.5 || Math.floor(a / N_NODES) === Math.floor(b / N_NODES)) continue;
        const dx = pPos[a * 3] - pPos[b * 3], dy = pPos[a * 3 + 1] - pPos[b * 3 + 1], dz = pPos[a * 3 + 2] - pPos[b * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 0.16) { lPos.set([pPos[a * 3], pPos[a * 3 + 1], pPos[a * 3 + 2], pPos[b * 3], pPos[b * 3 + 1], pPos[b * 3 + 2]], li * 6); li++; }
      }
    }
    lGeo.setDrawRange(0, li * 2);
    lGeo.attributes.position.needsUpdate = true;

    // droplets
    for (let d = 0; d < N_DROPS; d++) {
      const drop = drops[d], rip = ripples[d];
      const o = (nodeCount + d) * 3, mo = (nodeCount + N_DROPS + d) * 3;
      let alpha = 0, size = 0.05;
      if (drop.phase === 'wait') { drop.wait -= dt; if (drop.wait <= 0) { drop.phase = 'form'; drop.t = 0; drop.angle = Math.random() * Math.PI * 2; drop.dx = drop.dz = 0; } }
      else if (drop.phase === 'form') {
        drop.t += dt / 1.5; const u = clamp(drop.t, 0, 1);
        drop.r = 0.955; drop.y = 1.3 - u * 0.1; size = 0.015 + u * 0.03; alpha = smooth(0, 0.4, u);
        if (u >= 1) { drop.phase = 'fall'; drop.t = 0; }
      } else if (drop.phase === 'fall') {
        drop.t += dt / 0.6; const u = clamp(drop.t, 0, 1);
        const y0 = 1.2, y1 = saucerY(0.97) + 0.025;
        drop.y = y0 - (y0 - y1) * u * u; size = 0.045; alpha = 1;
        if (u >= 1) {
          drop.phase = 'wait'; drop.wait = 3 + Math.random() * 5;
          rip.t = 0; rip.mesh.visible = true;
          const lx = Math.cos(drop.angle) * 0.97 + drop.dx, lz = Math.sin(drop.angle) * 0.97 + drop.dz;
          rip.mesh.position.set(lx, saucerY(0.97) + 0.006, lz);
          rip.mark.t = 0; tmp.set(lx, saucerY(0.97) + 0.02, lz); sculpture.localToWorld(tmp); rip.mark.x = tmp.x; rip.mark.y = tmp.y; rip.mark.z = tmp.z;
        }
      }
      if (drop.phase === 'form' || drop.phase === 'fall') {
        tmp.set(Math.cos(drop.angle) * drop.r + drop.dx, drop.y, Math.sin(drop.angle) * drop.r + drop.dz);
        sculpture.localToWorld(tmp);
        if (drop.phase === 'fall') { push(tmp.x, tmp.y, tmp.z, pushOut); drop.dx += pushOut[0] * 0.25 * dt * 6; drop.dz += pushOut[2] * 0.25 * dt * 6; }
        pPos[o] = tmp.x; pPos[o + 1] = tmp.y; pPos[o + 2] = tmp.z;
      }
      pSize[nodeCount + d] = size; pAlpha[nodeCount + d] = alpha; pKind[nodeCount + d] = 0;
      // ripple ring and the small data mark it leaves behind
      if (rip.t < 1) {
        rip.t += dt / 1.1; const u = clamp(rip.t, 0, 1);
        const rad = 0.03 + u * 0.24; rip.mesh.scale.set(rad, 1, rad); rip.mesh.material.opacity = 0.55 * (1 - u);
        if (u >= 1) rip.mesh.visible = false;
      }
      if (rip.mark.t < 1) {
        rip.mark.t += dt / 1.6; const u = clamp(rip.mark.t, 0, 1);
        tmp.set(rip.mark.x, rip.mark.y, rip.mark.z);
        pPos[mo] = tmp.x; pPos[mo + 1] = tmp.y; pPos[mo + 2] = tmp.z;
        pSize[nodeCount + N_DROPS + d] = 0.06; pAlpha[nodeCount + N_DROPS + d] = smooth(0, 0.15, u) * (1 - smooth(0.6, 1, u)); pKind[nodeCount + N_DROPS + d] = 1;
      } else { pAlpha[nodeCount + N_DROPS + d] = 0; }
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.aSize.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true; pGeo.attributes.aKind.needsUpdate = true;
  }

  /* ---------- loop control: motion switch, visibility, viewport ---------- */
  let running = false, visible = !document.hidden, inView = true;
  let motionOn = (window.DataBarista && typeof window.DataBarista.motion === 'boolean') ? window.DataBarista.motion : !reduce;
  let last = 0;
  let live = false;
  function markLive() { if (live) return; live = true; slot.classList.add('is-live'); }
  function renderStill() { update(0); renderer.render(scene, camera); markLive(); }
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    update(dt);
    renderer.render(scene, camera);
    markLive();
  }
  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  function sync() { if (motionOn && visible && inView) start(); else stop(); }
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; sync(); });
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es[0].isIntersecting; sync(); }, { threshold: 0.02 }).observe(slot);
  document.addEventListener('db:motion', (e) => { motionOn = !!e.detail.on; sync(); if (!motionOn) renderStill(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); live = false; slot.classList.remove('is-live'); });

  function resize() {
    const w = slot.clientWidth, h = slot.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pMat.uniforms.uScale.value = (h * DPR) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    if (!running) renderStill();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(slot);
  resize();
  // a settled still first (also the reduced-motion composition), then the loop if motion is on
  for (let i = 0; i < 40; i++) update(0.05);
  renderStill();
  sync();

  window.DataBarista = window.DataBarista || {};
  window.DataBarista.observatory = {
    still(angle) { if (typeof angle === 'number') rotY = angle; stop(); renderStill(); },
    resume() { sync(); },
    get running() { return running; }
  };
}

const slot = document.querySelector('[data-observatory]');
if (slot) init(slot);
