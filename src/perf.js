// 性能模块：由 tools/patch.py 注入 index.html 的打包代码里。
// on=渲染器 ii=主光源 at/dt=屏幕宽高 Rt=参数。
// 1. 自适应：每 2 秒统计一次帧率，低于 48 帧先逐级降像素比（最低 1），再逐级降阴影贴图（最低 1024）。
// 2. lite 模式（--lite=1）：像素比固定 1、阴影 2048，蟑螂都没在跑的时候隔帧渲染（约 30 帧）。
var RA_pf = { t: 0, n: 0, last: 0, pr: on.getPixelRatio(), odd: !1, calm: new Set(["lurk", "gone", "peek", "freeze", "pose"]) };
function RA_perf() {
  // 用真实帧间隔统计（循环里的 dt 被截到 0.05）；超过 0.25 秒的间隔多半是休眠或被挂起，不计入
  let now = performance.now(), step = (now - RA_pf.last) / 1e3;
  RA_pf.last = now;
  if (Rt.lite || document.hidden || step > .25) return;
  RA_pf.t += step; RA_pf.n++;
  if (RA_pf.t < 2) return;
  let fps = RA_pf.n / RA_pf.t;
  RA_pf.t = RA_pf.n = 0;
  if (fps >= 48) return;
  if (RA_pf.pr > 1) {
    RA_pf.pr = Math.max(1, RA_pf.pr - .25);
    on.setPixelRatio(RA_pf.pr); on.setSize(at, dt);
  } else if (ii.shadow.mapSize.x > 1024) {
    let s = ii.shadow.mapSize.x / 2;
    ii.shadow.mapSize.set(s, s);
    ii.shadow.map && (ii.shadow.map.dispose(), ii.shadow.map = null);
  }
}
function RA_skip(rs) {
  if (!Rt.lite) return !1;
  RA_pf.odd = !RA_pf.odd;
  return RA_pf.odd && rs.every(r => RA_pf.calm.has(r.state));
}
