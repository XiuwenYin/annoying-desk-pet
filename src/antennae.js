// 触须模块：由 tools/patch_antennae.py 注入 index.html 的打包代码里。
// 这里直接使用打包后的压缩名：O=Vector3 Pt=Quaternion ht=Object3D zt=BufferGeometry
// wt=BufferAttribute rt=Mesh Nn=MeshStandardMaterial，tt/Ad/Ed/zr/kt/Rt/ru 为应用内工具与状态。

// 原模型的触须是绑在头骨上的两根僵直细管，不能单独动。这里把它们塌缩隐藏，只记下根部和末端位置，
// 再在每只蟑螂的头上挂两根程序化触须（逐帧重建的锥形管），可以各自摆动、弯曲、对准光标。
var RA_ANT = [];
function RA_prep(root) {
  let sm = null;
  root.traverse(o => { o.isSkinnedMesh && !sm && (sm = o); });
  if (!sm || !sm.geometry.index) return;
  let g = sm.geometry, pos = g.attributes.position, n = pos.count, ix = g.index.array;
  let si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  let hb = sm.skeleton.bones.findIndex(b => b.name === "head3_01");
  if (hb < 0) return;
  // 按三角形连通性分块，触须是独立的细长块
  let par = new Int32Array(n);
  for (let i = 0; i < n; i++) par[i] = i;
  let f = x => { for (; par[x] !== x;) x = par[x] = par[par[x]]; return x; };
  for (let i = 0; i < ix.length; i += 3) {
    let a = f(ix[i]), b = f(ix[i + 1]), c = f(ix[i + 2]);
    par[a] = c; par[f(b)] = c;
  }
  let comps = new Map();
  for (let i = 0; i < n; i++) { let r = f(i); (comps.get(r) || comps.set(r, []).get(r)).push(i); }
  let hp = root.getObjectByName("head3_01").getWorldPosition(new O()), v = new O();
  let get = [(a, i) => a.getX(i), (a, i) => a.getY(i), (a, i) => a.getZ(i), (a, i) => a.getW(i)];
  for (let vs of comps.values()) {
    if (vs.length > 2e3) continue;
    let onHead = 0;
    for (let i of vs) {
      let best = -1, bi = -1;
      for (let k = 0; k < 4; k++) { let w = get[k](sw, i); w > best && (best = w, bi = get[k](si, i)); }
      bi === hb && onHead++;
    }
    if (onHead < vs.length * .8) continue;
    let w = vs.map(i => v.fromBufferAttribute(pos, i).applyMatrix4(sm.bindMatrix).clone());
    let bI = 0, tI = 0;
    w.forEach((p, k) => { p.distanceTo(hp) < w[bI].distanceTo(hp) && (bI = k); });
    w.forEach((p, k) => { p.distanceTo(w[bI]) > w[tI].distanceTo(w[bI]) && (tI = k); });
    if (w[tI].distanceTo(w[bI]) < ru * .3) continue;
    let bx = pos.getX(vs[bI]), by = pos.getY(vs[bI]), bz = pos.getZ(vs[bI]);
    for (let i of vs) pos.setXYZ(i, bx, by, bz);
    RA_ANT.push({ base: w[bI], tip: w[tI] });
  }
  pos.needsUpdate = !0;
  g.computeBoundingBox(); g.computeBoundingSphere();
  RA_ANT.length !== 2 && (RA_ANT.length = 0);
}

var RA_SEG = 30, RA_SIDES = 6, RA_mat = null;
var RA_Ant = class {
  constructor(r) {
    this.r = r;
    let L = r.L, head = r.head, fr = this.frame = new ht();
    this.len = Rt.antenna * L;
    this.R0 = Math.max(.65, .0095 * L);
    // frame 挂在头骨上，朝向与 pivot 一致（+x 朝前、+y 朝上），单位是屏幕像素
    let hq = head.getWorldQuaternion(new Pt()), hs = head.getWorldScale(new O());
    let bw = RA_ANT.map(a => r.model.localToWorld(a.base.clone()));
    let mid = bw[0].clone().add(bw[1]).multiplyScalar(.5);
    head.add(fr);
    fr.position.copy(head.worldToLocal(mid.clone()));
    fr.quaternion.copy(hq.invert());
    fr.scale.setScalar(1 / hs.x);
    fr.updateMatrixWorld(!0);
    this.ground = -mid.y + .6;
    this.reachX = Math.max(bw[0].x, bw[1].x) + this.len + 2;
    RA_mat || (RA_mat = new Nn({ color: 0x6e3b1d, roughness: .32, metalness: .05, vertexColors: !0, side: 2 }));
    this.a = bw.map((b, k) => {
      let base = fr.worldToLocal(b.clone()), sg = Math.sign(base.z) || (k ? 1 : -1);
      let S = RA_SIDES, N = RA_SEG, nv = (N + 1) * S + 1, idx = [];
      let pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
      // 一节深一节浅，模拟触须的环节
      for (let i = 0; i <= N; i++) {
        let c = Math.min(1, (i % 2 ? 1 : .8) * (.85 + .3 * i / N));
        for (let j = 0; j < S; j++) col.set([c, c, c], (i * S + j) * 3);
      }
      col.set([1, 1, 1], (nv - 1) * 3);
      for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) {
        let a0 = i * S + j, a1 = i * S + (j + 1) % S;
        idx.push(a0, a0 + S, a1, a1, a0 + S, a1 + S);
      }
      for (let j = 0; j < S; j++) idx.push(N * S + j, nv - 1, N * S + (j + 1) % S);
      let geo = new zt();
      geo.setAttribute("position", new wt(pos, 3));
      geo.setAttribute("normal", new wt(nor, 3));
      geo.setAttribute("color", new wt(col, 3));
      geo.setIndex(idx);
      let m = new rt(geo, RA_mat);
      m.castShadow = !0; m.frustumCulled = !1;
      fr.add(m);
      let rest = sg * .5;
      return {
        base, sg, geo, pos, nor,
        yaw: rest, yv: 0, pit: .3, pv: 0, yT: rest, pT: .3, w: 8, tm: tt(0, .6), sn: !1,
        ys: new Float32Array(N + 1).fill(rest), ps: new Float32Array(N + 1).fill(.3), tr: zr(), tr2: zr()
      };
    });
  }
  // 给一根触须挑下一个目标角度：平时慢扫、快弹、偶尔死一般静止；光标靠近时频繁抽动着对准它
  pick(a, run, sense, rel) {
    a.sn = sense;
    if (run) { a.yT = a.sg * tt(.12, .4); a.pT = tt(.08, .2); a.w = 14; a.tm = tt(.08, .3); }
    else if (sense) {
      a.yT = Math.random() < .25 ? a.sg * tt(.2, .9) : rel + tt(-.12, .12);
      a.pT = tt(.35, .65); a.w = tt(20, 32); a.tm = tt(.07, .45);
    } else {
      let q = Math.random();
      if (q < .12) { a.w = tt(2, 4); a.tm = tt(1, 3.2); }
      else if (q < .22) { a.yT = a.sg * tt(-.3, .05); a.pT = tt(.1, .4); a.w = tt(10, 16); a.tm = tt(.3, .9); }
      else { a.yT = a.sg * tt(.1, 1.15); a.pT = tt(.1, .5); a.w = q < .5 ? tt(18, 30) : tt(4, 9); a.tm = tt(.2, 1.6); }
    }
    a.yT = a.sg * Ad(a.yT * a.sg, -.45, 1.5);
  }
  update(dt) {
    let r = this.r, st = r.state;
    if (st === "gone" || dt <= 0) return;
    let mv = performance.now() - kt.moved < 900;
    let hx = r.x + Math.cos(r.h) * r.front, hy = r.y + Math.sin(r.h) * r.front;
    let rel = Ed(Math.atan2(kt.y - hy, kt.x - hx) - r.h);
    let run = st === "dash" || st === "flee" || st === "retract";
    let sense = !run && mv && Math.hypot(kt.x - hx, kt.y - hy) < Rt.fleeRadius * 3.2;
    let N = RA_SEG, S = RA_SIDES, ds = this.len / N, K = 1 - Math.exp(-dt * (run ? 200 : 120));
    for (let a of this.a) {
      a.tm -= dt;
      (a.tm <= 0 || sense !== a.sn) && this.pick(a, run, sense, rel);
      let k = Math.ceil(dt * 240), h = dt / k, w2 = a.w * a.w;
      for (let i = 0; i < k; i++) {
        a.yv += (w2 * (a.yT - a.yaw) - 2 * a.w * a.yv) * h; a.yaw += a.yv * h;
        a.pv += (w2 * (a.pT - a.pit) - 2 * a.w * a.pv) * h; a.pit += a.pv * h;
      }
      // 每一节跟着前一节走，末梢有延迟，形成鞭梢似的弯曲
      a.ys[0] = a.yaw + a.tr(r.t * 9) * .03 + a.tr2(r.t * 1.7) * .06;
      a.ps[0] = a.pit + a.tr2(r.t * 7) * .02;
      for (let i = 1; i <= N; i++) { a.ys[i] += (a.ys[i - 1] - a.ys[i]) * K; a.ps[i] += (a.ps[i - 1] - a.ps[i]) * K; }
      let px = a.base.x, py = a.base.y, pz = a.base.z, P = a.pos, Q = a.nor;
      let tx = 1, ty = 0, tz = 0;
      for (let i = 0; i <= N; i++) {
        let u = i / N;
        if (i < N) {
          let yw = a.ys[i] + a.sg * .22 * u ** 1.5, pt = a.ps[i] - .55 * u ** 1.6, cp = Math.cos(pt);
          tx = cp * Math.cos(yw); ty = Math.sin(pt); tz = cp * Math.sin(yw);
        }
        let nl = Math.hypot(tz, tx) || 1, nx = -tz / nl, nz = tx / nl;
        let bx = -nz * ty, by = nz * tx - nx * tz, bz = nx * ty;
        let rad = this.R0 * (i < 2 ? 1.35 : 1) * (1 - .7 * u);
        for (let j = 0; j < S; j++) {
          let ph = j / S * 6.2832, c = Math.cos(ph), s = Math.sin(ph), o = (i * S + j) * 3;
          let ox = c * nx + s * bx, oy = s * by, oz = c * nz + s * bz;
          P[o] = px + ox * rad; P[o + 1] = py + oy * rad; P[o + 2] = pz + oz * rad;
          Q[o] = ox; Q[o + 1] = oy; Q[o + 2] = oz;
        }
        if (i < N) { px += tx * ds; py = Math.max(this.ground, py + ty * ds); pz += tz * ds; }
      }
      let o = (N + 1) * S * 3;
      P[o] = px + tx * ds * .3; P[o + 1] = py; P[o + 2] = pz + tz * ds * .3;
      Q[o] = tx; Q[o + 1] = ty; Q[o + 2] = tz;
      a.geo.attributes.position.needsUpdate = !0;
      a.geo.attributes.normal.needsUpdate = !0;
    }
  }
};
