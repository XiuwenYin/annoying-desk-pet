const { app, BrowserWindow, screen, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const { createShakeDetector } = require('./shake');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

// 命令行参数 --count=3 --speed=1400 等透传给页面
const query = {};
for (const a of process.argv.slice(1)) {
  const m = a.match(/^--(\w+)=(.+)$/);
  if (m) query[m[1]] = m[2];
}

let win, tray;
let origin = { x: 0, y: 0 };

// 铺满主显示器；分辨率变化、插拔显示器时重新铺
function fit() {
  if (!win || win.isDestroyed()) return;
  const b = screen.getPrimaryDisplay().bounds;
  origin = { x: b.x, y: b.y };
  win.setBounds(b);
}

app.whenReady().then(() => {
  if (!gotLock) return;
  if (process.platform === 'darwin' && app.dock) app.dock.hide();

  const { x, y, width, height } = screen.getPrimaryDisplay().bounds;
  win = new BrowserWindow({
    x, y, width, height,
    transparent: true, frame: false, resizable: false, movable: false,
    hasShadow: false, skipTaskbar: true, focusable: false,
    alwaysOnTop: true, fullscreenable: false, enableLargerThanScreen: true,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  fit();
  win.setIgnoreMouseEvents(true); // 完全点击穿透，不影响正常使用
  win.loadFile(path.join(__dirname, 'index.html'), { query });
  for (const ev of ['display-metrics-changed', 'display-added', 'display-removed']) screen.on(ev, fit);

  // 甩鼠标退出：1.5 秒内左右来回甩 6 次（每次至少 150px），--shakeQuit=0 关闭
  const shake = query.shakeQuit === '0' ? null : createShakeDetector();

  // 主进程轮询光标位置，避免依赖穿透窗口的鼠标事件
  setInterval(() => {
    if (win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    if (shake && shake(p.x, Date.now())) return app.quit();
    win.webContents.send('cursor', { x: p.x - origin.x, y: p.y - origin.y });
  }, 33);

  // 退出快捷键：Ctrl+Alt+Shift+Q（Mac 为 Cmd+Alt+Shift+Q）
  const ok = globalShortcut.register('CommandOrControl+Alt+Shift+Q', () => app.quit());
  if (!ok) console.warn('退出快捷键被占用，请用菜单栏/托盘图标退出');

  // 托盘兜底：快捷键被占用时也能退出（Dock 图标已隐藏）
  tray = new Tray(path.join(__dirname, 'assets', 'tray.png'));
  tray.setToolTip('RoachPet');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: '退出 RoachPet', click: () => app.quit() }]));
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
