const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function refactorStyles(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.css')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Flatten rounded corners
  content = content.replace(/rounded-\[.*?\]/g, 'rounded-xl');
  content = content.replace(/rounded-3xl/g, 'rounded-xl');
  content = content.replace(/rounded-2xl/g, 'rounded-lg');
  
  // Flatten shadows
  content = content.replace(/shadow-\[.*?\]/g, 'shadow-sm');
  content = content.replace(/shadow-2xl/g, 'shadow-md');
  content = content.replace(/shadow-xl/g, 'shadow-md');

  // Remove blur & glassmorphism
  content = content.replace(/backdrop-blur(-\w+)?/g, '');
  content = content.replace(/bg-white\/\d+/g, 'bg-white');

  // Convert dark boxes to light boxes
  content = content.replace(/bg-slate-900/g, 'bg-white border border-slate-200 text-slate-800');
  content = content.replace(/text-slate-400/g, 'text-slate-500');

  // We should be careful with some gradient overrides
  content = content.replace(/bg-gradient-to-br from-indigo-600 to-indigo-900/g, 'bg-white border border-slate-200 text-slate-800');
  content = content.replace(/bg-gradient-to-br from-indigo-500 to-purple-600/g, 'bg-white border border-slate-200 text-slate-800');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir('./src/components', refactorStyles);
walkDir('./src/app', refactorStyles);
console.log('Refactoring complete.');
