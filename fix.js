const fs = require('fs');

const files = ['src/app/(auth)/dang-ky/page.tsx', 'src/lib/mail.ts'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
