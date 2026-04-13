/**
 * Batch script to update ALL admin pages to use dynamic themeColor 
 * from usePreferencesStore instead of hardcoded purple (#722ed1, #8b5cf6, #6366f1).
 * 
 * Strategy:
 * - #722ed1 → themeColor (this is the "primary accent" purple used for icons, borders, values)
 * - #8b5cf6 → themeColor (similar primary purple)
 * - #6366f1 → themeColor (indigo variant used alongside #8b5cf6)
 * - BUT skip AuroraText colors arrays (those are decorative gradient arrays)
 * - BUT skip SteppedFormModal gradient props (those are decorative)
 * - BUT skip GlitchText colors (decorative)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IMPORT_LINE = `import { usePreferencesStore } from "@/store/usePreferencesStore";`;
const HOOK_LINE = `    const { themeColor } = usePreferencesStore();`;

// Find all page.tsx files recursively under src/app/admin
function findPages(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findPages(full));
    } else if (entry.name === 'page.tsx') {
      results.push(full);
    }
  }
  return results;
}

const adminDir = path.join(__dirname, 'src', 'app', 'admin');
const pages = findPages(adminDir);

let totalFiles = 0;
let modifiedFiles = 0;

for (const filePath of pages) {
  const relPath = path.relative(adminDir, filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Skip if already has usePreferencesStore AND themeColor
  const hasImport = content.includes('usePreferencesStore');
  const hasHook = content.includes('themeColor');

  // Check if file has any hardcoded purples to replace (outside AuroraText/gradient arrays)
  const has722 = /#722ed1/.test(content);
  const has8b5 = /#8b5cf6/.test(content);
  const has636 = /#6366f1/.test(content);
  
  if (!has722 && !has8b5 && !has636) {
    continue; // No purple refs at all
  }

  totalFiles++;

  // Count replaceable occurrences (not inside AuroraText colors arrays or gradient props)
  // We need to check line by line
  const lines = content.split('\n');
  let hasReplaceableColor = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines that are part of AuroraText colors arrays
    if (line.includes('AuroraText') && line.includes('colors=')) continue;
    // Skip gradient props  
    if (line.includes('gradient={[')) continue;
    // Skip GlitchText
    if (line.includes('glitchColor')) continue;
    
    if (/#722ed1/.test(line) || /#8b5cf6/.test(line) || /#6366f1/.test(line)) {
      // Check if it's in a style/color context (not an array of colors for decorative purposes)
      if (line.includes('color:') || line.includes('color=') || 
          line.includes('solid #') || line.includes('borderLeft') || 
          line.includes('borderTop') || line.includes('background:') ||
          line.includes('Background') || line.includes('valueStyle') ||
          line.includes('WebkitTextFillColor') || line.includes('textAlign')) {
        hasReplaceableColor = true;
        break;
      }
    }
  }

  if (!hasReplaceableColor) {
    console.log(`⏭  ${relPath}: only decorative colors, skipping`);
    continue;
  }

  let changes = [];

  // 1. Add import if not present
  if (!hasImport) {
    const importPattern = /import DecryptedText[^\n]+\n/;
    const auroraPattern = /import \{ AuroraText \}[^\n]+\n/;
    const lastImportPattern = /(import [^\n]+\n)(?!import)/;
    
    if (importPattern.test(content)) {
      content = content.replace(importPattern, (match) => match + IMPORT_LINE + '\n');
      changes.push('added import');
    } else if (auroraPattern.test(content)) {
      content = content.replace(auroraPattern, (match) => match + IMPORT_LINE + '\n');
      changes.push('added import (after AuroraText)');
    } else {
      // Find last import line
      const importLines = content.split('\n');
      let lastIdx = -1;
      for (let i = 0; i < importLines.length; i++) {
        if (importLines[i].trim().startsWith('import ')) lastIdx = i;
      }
      if (lastIdx >= 0) {
        importLines.splice(lastIdx + 1, 0, IMPORT_LINE);
        content = importLines.join('\n');
        changes.push('added import (after last)');
      }
    }
  }

  // 2. Add hook call if not present  
  if (!hasHook) {
    // Find the first useState line
    const hookPattern = /const \[\w+, set\w+\] = useState[^;]+;/;
    const hookMatch = content.match(hookPattern);
    if (hookMatch) {
      const idx = content.indexOf(hookMatch[0]) + hookMatch[0].length;
      content = content.slice(0, idx) + '\n' + HOOK_LINE + content.slice(idx);
      changes.push('added hook');
    } else {
      // Try to find after 'return (' 
      // Some pages may not have useState. Find the component body start
      const fnMatch = content.match(/export default function \w+\([^)]*\)\s*\{/);
      if (fnMatch) {
        const idx = content.indexOf(fnMatch[0]) + fnMatch[0].length;
        content = content.slice(0, idx) + '\n' + HOOK_LINE + content.slice(idx);
        changes.push('added hook (after fn)');
      }
    }
  }

  // 3. Line-by-line replacement of hardcoded purples
  const newLines = content.split('\n');
  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    
    // Skip AuroraText color arrays, gradient props, GlitchText
    if (line.includes('AuroraText') && line.includes('colors=')) continue;
    if (line.includes('gradient={[')) continue;
    if (line.includes('glitchColor')) continue;
    // Skip import lines
    if (line.trim().startsWith('import ')) continue;
    
    // Replace #722ed1 in style contexts
    let newLine = line;
    newLine = newLine.replace(/color: '#722ed1'/g, 'color: themeColor');
    newLine = newLine.replace(/color: "#722ed1"/g, 'color: themeColor');
    newLine = newLine.replace(/color="#722ed1"/g, 'color={themeColor}');
    newLine = newLine.replace(/'4px solid #722ed1'/g, '`4px solid ${themeColor}`');
    newLine = newLine.replace(/"4px solid #722ed1"/g, '`4px solid ${themeColor}`');
    newLine = newLine.replace(/'3px solid #722ed1'/g, '`3px solid ${themeColor}`');
    newLine = newLine.replace(/"3px solid #722ed1"/g, '`3px solid ${themeColor}`');

    // Replace #8b5cf6 in style contexts
    newLine = newLine.replace(/color: '#8b5cf6'/g, 'color: themeColor');
    newLine = newLine.replace(/color: "#8b5cf6"/g, 'color: themeColor');
    newLine = newLine.replace(/color="#8b5cf6"/g, 'color={themeColor}');
    newLine = newLine.replace(/'4px solid #8b5cf6'/g, '`4px solid ${themeColor}`');
    newLine = newLine.replace(/'3px solid #8b5cf6'/g, '`3px solid ${themeColor}`');

    // Replace #6366f1 in style contexts
    newLine = newLine.replace(/color: '#6366f1'/g, 'color: themeColor');
    newLine = newLine.replace(/color: "#6366f1"/g, 'color: themeColor');
    newLine = newLine.replace(/color="#6366f1"/g, 'color={themeColor}');
    
    // Replace gradient backgrounds containing these colors
    // "linear-gradient(135deg, #6366f1, #8b5cf6)" → `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`
    newLine = newLine.replace(/'linear-gradient\(135deg, #6366f1, #8b5cf6\)'/g, 
      '`linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`');
    newLine = newLine.replace(/"linear-gradient\(135deg, #6366f1, #8b5cf6\)"/g, 
      '`linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`');
    newLine = newLine.replace(/'linear-gradient\(to right, #8b5cf6, #6366f1\)'/g, 
      '`linear-gradient(to right, ${themeColor}, ${themeColor}dd)`');
    newLine = newLine.replace(/"linear-gradient\(to right, #8b5cf6, #6366f1\)"/g, 
      '`linear-gradient(to right, ${themeColor}, ${themeColor}dd)`');
    newLine = newLine.replace(/'linear-gradient\(135deg, #8b5cf6, #6366f1\)'/g, 
      '`linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`');

    // Handle standalone hex as object values: { color: '#8b5cf6' }
    // "#8b5cf6" as a standalone prop value (like color prop on Badge, etc)
    newLine = newLine.replace(/color="?'?#8b5cf6'?"?/g, (match) => {
      if (match.includes('themeColor')) return match; // Already replaced
      if (match.startsWith('color="')) return 'color={themeColor}';
      if (match.startsWith("color='")) return 'color={themeColor}';
      if (match.startsWith('color: "') || match.startsWith("color: '")) return 'color: themeColor';
      return match;
    });

    newLines[i] = newLine;
  }
  content = newLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFiles++;
    
    // Count remaining hardcoded purples
    const remaining = (content.match(/#722ed1|#8b5cf6|#6366f1/g) || []).length;
    console.log(`✅ ${relPath}: ${changes.join(', ')}${remaining > 0 ? ` (${remaining} decorative refs remain)` : ''}`);
  } else {
    console.log(`⏭  ${relPath}: no actionable changes`);
  }
}

console.log(`\n📊 Result: ${modifiedFiles}/${totalFiles} files modified`);
