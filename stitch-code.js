import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(__dirname, 'stitched_code.txt');

let stitchedContent = '';

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else {
      // Only include React/TS/JS files, exclude assets and css
      if (file.match(/\.(tsx|ts|jsx|js)$/)) {
        const relativePath = path.relative(__dirname, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        stitchedContent += `\n\n// ==========================================\n`;
        stitchedContent += `// FILE: ${relativePath}\n`;
        stitchedContent += `// ==========================================\n\n`;
        stitchedContent += content;
      }
    }
  }
}

try {
  console.log('Menyiapkan file stitched_code.txt...');
  walkDir(srcDir);
  fs.writeFileSync(outputFile, stitchedContent);
  console.log('✅ Selesai! Semua kode src telah digabungkan ke dalam file: stitched_code.txt');
  console.log('Silakan copy isi file tersebut untuk digunakan bersama prompt redesign.');
} catch (error) {
  console.error('Terjadi kesalahan:', error);
}
