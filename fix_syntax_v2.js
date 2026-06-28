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
    const original = content;
    
    content = content.split("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api'").join("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api`");
    content = content.split("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login'").join("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`");
    content = content.split("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/settings'").join("${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/settings`");
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed syntax in', file);
    }
});
