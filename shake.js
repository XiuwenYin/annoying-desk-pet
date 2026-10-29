// 甩鼠标检测：短时间内左右来回甩够次数就触发。
// 只看水平方向；每次折返要比上一个极点反向移动至少 amp 像素才算数，正常移动鼠标很难凑够。
function createShakeDetector({ amp = 150, turns = 6, windowMs = 1500 } = {}) {
  let dir = 0, ext = 0, lo = Infinity, hi = -Infinity, hits = [];
  return function feed(x, now) {
    if (dir === 0) {
      // 还没有方向：两端都记，跨度够了才定下第一次甩的方向
      lo = Math.min(lo, x); hi = Math.max(hi, x);
      if (hi - lo < amp) return false;
      dir = x === hi ? 1 : -1;
    } else {
      if ((dir === 1 && x > ext) || (dir === -1 && x < ext)) { ext = x; return false; } // 同向继续甩
      if (Math.abs(x - ext) < amp) return false;
      dir = -dir;
    }
    ext = x;
    hits.push(now);
    hits = hits.filter(t => now - t < windowMs);
    if (hits.length >= turns) { hits = []; return true; }
    return false;
  };
}

module.exports = { createShakeDetector };
