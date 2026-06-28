const fs = require('fs');
const path = require('path');
const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            filelist = walkSync(dirFile, filelist);
        } else {
            filelist.push(dirFile);
        }
    });
    return filelist;
};
const files = walkSync('./frontend/src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Fix: const API = ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api';
    if (content.includes("const API = ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api';")) {
        content = content.replace(/const API = \$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:3001'\}\/api';/g, "const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api`;");
        changed = true;
    }
    
    // Fix: fetch(${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login',
    if (content.includes("fetch(${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login', {") || content.includes("fetch(${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login',")) {
        content = content.replace(/fetch\(\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:3001'\}\/api\/auth\/login',/g, "fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`,");
        changed = true;
    }
    
    // Fix: fetch(${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/settings',
    if (content.includes("fetch(${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/settings',")) {
        content = content.replace(/fetch\(\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:3001'\}\/api\/admin\/settings',/g, "fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/settings`,");
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed syntax in', file);
    }
});
