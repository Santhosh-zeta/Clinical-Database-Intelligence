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

let changedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace hardcoded const API
    content = content.replace(/const API = 'http:\/\/localhost:3001\/api';/g, "const API = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api`;");
    
    // Replace inline fetch calls
    content = content.replace(/fetch\('http:\/\/localhost:3001\/api/g, "fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api");

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedCount++;
        console.log(`Updated URLs in ${file}`);
    }
}

console.log(`Fixed URLs in ${changedCount} files.`);
