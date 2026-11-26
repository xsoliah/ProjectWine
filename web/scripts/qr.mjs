// Gibt einen QR-Code für die übergebene URL in der Konsole aus (genutzt von dev.ps1).
// Aufruf:  node scripts/qr.mjs http://192.168.1.23:4200
import qrcode from 'qrcode-terminal';

const url = process.argv[2];
if (!url) {
  console.error('Aufruf: node scripts/qr.mjs <url>');
  process.exit(1);
}

qrcode.generate(url, { small: true }, (code) => {
  console.log(code);
  console.log(`  ${url}`);
});
