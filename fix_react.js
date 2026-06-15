const fs = require('fs');
const files = [
  'admin/src/app/admin/forms/builder/page.tsx',
  'admin/src/app/admin/forms/fill/page.tsx',
  'admin/src/app/admin/forms/logic/page.tsx',
  'admin/src/app/admin/forms/response/page.tsx',
  'admin/src/app/admin/inventory/item-locator/page.tsx',
  'admin/src/app/admin/inventory/location-browser/page.tsx',
  'admin/src/app/admin/pm/dashboard/page.tsx',
  'admin/src/app/admin/pages/builder/page.tsx'
];

for(let f of files) {
  if(!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('import React')) {
    let matchUseClient = content.match(/["']use client["'];?/);
    if (matchUseClient) {
        content = content.replace(matchUseClient[0], matchUseClient[0] + '\nimport React from "react";');
    } else {
        content = 'import React from "react";\n' + content;
    }
    fs.writeFileSync(f, content);
    console.log('Added React import to', f);
  }
}
