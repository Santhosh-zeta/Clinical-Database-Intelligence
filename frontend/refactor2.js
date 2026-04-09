const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixConflicts(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Clean up conflicting classes: if a div has bg-white, text-slate-800, and text-white, we want to remove text-white.
  // Less risky way: find instances of " text-white " or " text-white" in the same className string.
  // Actually, we can just look for lines containing both and do a safe string replace.
  let lines = content.split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
     if (lines[i].includes('bg-white') && lines[i].includes('text-slate-800') && lines[i].includes('text-white')) {
         lines[i] = lines[i].replace('text-white', '');
         changed = true;
     }
     
     // Also fix `text-indigo-100` inside light boxes
     if (lines[i].includes('text-indigo-100') && lines[i].includes('tracking-wide')) {
         lines[i] = lines[i].replace('text-indigo-100', 'text-slate-500');
         changed = true;
     }

     if (lines[i].includes('text-white/80') || lines[i].includes('text-white/5') || lines[i].includes('text-white/10')) {
         lines[i] = lines[i].replace(/text-white\/\d+/g, 'text-slate-400');
         changed = true;
     }
  }

  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Fixed conflicts in ${filePath}`);
  }
}

walkDir('./src/components', fixConflicts);
walkDir('./src/app', fixConflicts);
