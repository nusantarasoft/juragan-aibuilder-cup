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
  let match = content.match(/export default function (\w+)\(\)\s*\{/);
  if(match && !content.includes('<React.Suspense fallback=')) {
    let oldName = match[1];
    let newName = oldName + 'Content';
    content = content.replace(match[0], `export default function ${oldName}() { return <React.Suspense fallback={<div>Loading...</div>}><${newName} /></React.Suspense>; } \nfunction ${newName}() {`);
    
    // Check if React is imported, if not we don't strictly need it as long as we use React.Suspense and it's Next 14, but let's be safe.
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
}
