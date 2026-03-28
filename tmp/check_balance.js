
const fs = require('fs');
const content = fs.readFileSync('c:/Users/Az09.Team/Git-projects/demo_phong_tro_test/src/components/ui/phong-detail-dialog.tsx', 'utf8');

let p = 0;
let b = 0;
let s = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '(') p++;
    if (content[i] === ')') p--;
    if (content[i] === '{') b++;
    if (content[i] === '}') b--;
    if (content[i] === '[') s++;
    if (content[i] === ']') s--;
}

console.log(`Paren: ${p}, Braces: ${b}, Brackets: ${s}`);
