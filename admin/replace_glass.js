const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const dirsToScan = [
  path.join(__dirname, 'src/app/admin/crm'),
  path.join(__dirname, 'src/app/admin/media')
];

let allFiles = [];
dirsToScan.forEach(dir => {
    if (fs.existsSync(dir)) {
        allFiles = allFiles.concat(walkSync(dir));
    }
});

let updatedCount = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Remove the const glass definition
  content = content.replace(/const glass = \{ background: 'rgba\(255,255,255,0\.65\)', backdropFilter: 'blur\(12px\)', border: '1px solid rgba\(255,255,255,0\.45\)', borderRadius: 14 \};\r?\n?/g, '');
  
  // Replace style={{ ...glass }}
  content = content.replace(/style=\{\{\s*\.\.\.glass\s*\}\}/g, '');
  
  // Replace style={{ ...glass, otherProps }}
  content = content.replace(/style=\{\{\s*\.\.\.glass,\s*/g, 'style={{ ');
  
  // Replace style={glass}
  content = content.replace(/style=\{glass\}/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    updatedCount++;
  }
});

console.log(`Finished. Updated ${updatedCount} files.`);
