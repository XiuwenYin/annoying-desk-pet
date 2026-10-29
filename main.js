const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) app.quit();

// 命令行参数 --count=3 --speed=1400 等透传给页面
const query = {};
for (const a of process.argv.slice(1)) {
  const m = a.match(/^--(\w+)=(.+)$/);
  if (m) query[m[1]] = m[2];
}

let win;
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();

  const d = screen.getPrimaryDisplay();
  const { x, y, width, height } = d.bounds;

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
  win.setBounds({ x, y, width, height });
  win.setIgnoreMouseEvents(true); // 完全点击穿透，不影响正常使用
  win.loadFile(path.join(__dirname, 'index.html'), { query });

  // 主进程轮询光标位置，避免依赖穿透窗口的鼠标事件
  setInterval(() => {
    if (win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint();
    win.webContents.send('cursor', { x: p.x - x, y: p.y - y });
  }, 33);

  // 退出快捷键：Ctrl+Alt+Shift+Q（Mac 为 Cmd+Alt+Shift+Q）
  globalShortcut.register('CommandOrControl+Alt+Shift+Q', () => app.quit());
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
