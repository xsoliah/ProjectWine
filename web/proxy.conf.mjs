// Dev-Server-Proxy: /api an das Backend weiterleiten. Ziel per Umgebungsvariable API_URL änderbar (setzt dev.ps1).
export default {
  '/api': {
    target: process.env.API_URL || 'http://localhost:5000',
    secure: false,
    changeOrigin: true,
  },
};
