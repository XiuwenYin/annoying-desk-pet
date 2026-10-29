const { contextBridge, ipcRenderer } = require('electron');

// 主进程每 33ms 推送一次光标坐标（窗口是点击穿透的，收不到鼠标事件）
contextBridge.exposeInMainWorld('roachBridge', {
  onCursor: (cb) => ipcRenderer.on('cursor', (_e, p) => cb(p)),
});
