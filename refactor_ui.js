const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        try {
            filelist = walkSync(dirFile, filelist);
        } catch (err) {
            if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist.push(dirFile);
        }
    });
    return filelist;
};

const files = walkSync('./frontend/src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const ignoreFiles = [];

const replacements = [
    // Remove heavy borders and shadow
    { regex: /border-2 border-black/g, replacement: 'border border-slate-200 shadow-sm rounded-2xl' },
    { regex: /border-b-2 border-black/g, replacement: 'border-b border-slate-200' },
    { regex: /border-t-2 border-black/g, replacement: 'border-t border-slate-200' },
    { regex: /border-l-2 border-black/g, replacement: 'border-l border-slate-200' },
    { regex: /border-r-2 border-black/g, replacement: 'border-r border-slate-200' },
    { regex: /border-l-4 border-black/g, replacement: 'border-l-4 border-indigo-500 rounded-l-2xl shadow-lg' },
    { regex: /border border-black border-dashed/g, replacement: 'border-2 border-dashed border-slate-300 rounded-2xl' },
    { regex: /border border-black/g, replacement: 'border border-slate-200 shadow-sm rounded-xl' },
    { regex: /border-black/g, replacement: 'border-slate-200 rounded-xl' },
    { regex: /border-gray-400/g, replacement: 'border-slate-200' },
    { regex: /border-gray-300/g, replacement: 'border-slate-100' },
    { regex: /border-gray-200/g, replacement: 'border-slate-100' },

    // Soften shadows
    { regex: /shadow-\[inset_2px_2px_0px_rgba\(0,0,0,0\.2\)\]/g, replacement: 'shadow-inner rounded-xl' },
    { regex: /shadow-\[2px_2px_0px_#000\]/g, replacement: 'shadow-md rounded-xl' },
    { regex: /shadow-\[inset_0_0_10px_rgba\(0,0,0,0\.5\)\]/g, replacement: 'shadow-inner' },

    // Soften grays and bg colors
    { regex: /bg-gray-100/g, replacement: 'bg-slate-50' },
    { regex: /bg-gray-200/g, replacement: 'bg-slate-50/80 backdrop-blur-sm' },
    { regex: /bg-gray-300/g, replacement: 'bg-white shadow-sm rounded-xl' },
    { regex: /text-gray-900/g, replacement: 'text-slate-800' },
    { regex: /text-gray-800/g, replacement: 'text-slate-700' },
    { regex: /text-gray-700/g, replacement: 'text-slate-600' },
    { regex: /text-gray-600/g, replacement: 'text-slate-500' },
    { regex: /text-gray-500/g, replacement: 'text-slate-400' },
    { regex: /text-black/g, replacement: 'text-slate-800' },
    { regex: /bg-black/g, replacement: 'bg-slate-800' },
    
    // Convert hard reds/blues to modern pastel/vibrant variants
    { regex: /bg-red-700/g, replacement: 'bg-rose-600 rounded-xl shadow-sm' },
    { regex: /bg-red-800/g, replacement: 'bg-rose-700' },
    { regex: /bg-red-600/g, replacement: 'bg-rose-500 rounded-xl shadow-sm' },
    { regex: /bg-red-200/g, replacement: 'bg-rose-50' },
    { regex: /bg-red-100/g, replacement: 'bg-rose-50' },
    { regex: /text-red-900/g, replacement: 'text-rose-700' },
    { regex: /text-red-700/g, replacement: 'text-rose-600' },
    { regex: /bg-yellow-300/g, replacement: 'bg-amber-100 rounded-xl' },
    { regex: /bg-blue-800/g, replacement: 'bg-blue-600 rounded-xl shadow-sm' },
    { regex: /bg-blue-900/g, replacement: 'bg-blue-700' },
    { regex: /border-blue-800/g, replacement: 'border-blue-200' },

    // Soften fonts
    { regex: /font-black/g, replacement: 'font-bold' },
    { regex: /font-mono uppercase/g, replacement: 'font-semibold tracking-tight' },
    { regex: /font-mono/g, replacement: 'font-sans' },

    // Remove random 0px padding or hard things
    { regex: /rounded-none/g, replacement: 'rounded-xl' }
];

let changedCount = 0;

for (const file of files) {
    if (ignoreFiles.some(ignore => file.includes(ignore))) continue;

    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedCount++;
        console.log(`Updated ${file}`);
    }
}

console.log(`Refactored ${changedCount} files.`);
