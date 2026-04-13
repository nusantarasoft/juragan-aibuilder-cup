/**
 * Batch script to update all ITSM + other pages to use dynamic themeColor 
 * from usePreferencesStore instead of hardcoded purple values.
 * 
 * For each page:
 * 1. Add import for usePreferencesStore (if not present)
 * 2. Add `const { themeColor } = usePreferencesStore();` hook call
 * 3. Replace hardcoded '#722ed1' with themeColor
 */

import fs from 'fs';
import path from 'path';

const ITSM_BASE = 'src/app/admin/itsm';
const ITSM_DIRS = [
  'agents', 'availability', 'catalog', 'categories', 'changes',
  'cmdb', 'continuity', 'dashboard', 'deployments', 'events',
  'knowledge', 'portfolio', 'problems', 'releases', 'requests',
  'sla', 'tickets'
];

const IMPORT_LINE = `import { usePreferencesStore } from "@/store/usePreferencesStore";`;

let totalFiles = 0;
let modifiedFiles = 0;

for (const dir of ITSM_DIRS) {
  const filePath = path.join(ITSM_BASE, dir, 'page.tsx');
  if (!fs.existsSync(filePath)) {
    console.log(`⏭  ${dir}: file not found`);
    continue;
  }

  totalFiles++;
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = [];

  // 1. Add import if not present
  if (!content.includes('usePreferencesStore')) {
    // Insert after the last import line ending with DecryptedText or AuroraText
    const importPattern = /import DecryptedText[^\n]+\n/;
    const auroraPattern = /import \{ AuroraText \}[^\n]+\n/;
    
    if (importPattern.test(content)) {
      content = content.replace(importPattern, (match) => match + IMPORT_LINE + '\n');
      changes.push('added import');
    } else if (auroraPattern.test(content)) {
      content = content.replace(auroraPattern, (match) => match + IMPORT_LINE + '\n');
      changes.push('added import (after AuroraText)');
    }
  }

  // 2. Add hook call if not present
  if (!content.includes('themeColor') || !content.includes('usePreferencesStore()')) {
    // Find where to insert: after first useState or useEffect, or after "use client" component function
    // Strategy: insert after the first `const [` block or after function declaration
    // We look for patterns like: const [loading, setLoading] = useState or similar early hooks

    // Find the first useState line
    const hookPattern = /const \[\w+, set\w+\] = useState[^;]+;/;
    const hookMatch = content.match(hookPattern);
    if (hookMatch) {
      const idx = content.indexOf(hookMatch[0]) + hookMatch[0].length;
      const before = content.slice(0, idx);
      const after = content.slice(idx);
      content = before + `\n    const { themeColor } = usePreferencesStore();` + after;
      changes.push('added hook call');
    }
  }

  // 3. Replace '#722ed1' with themeColor  
  // Handle both style={{ color: '#722ed1' }} and color="#722ed1"
  // But NOT inside AuroraText colors arrays
  
  // Replace in style objects: color: '#722ed1' -> color: themeColor
  const replacements = [
    [/color: '#722ed1'/g, 'color: themeColor'],
    [/color: "#722ed1"/g, 'color: themeColor'],
    [/color="#722ed1"/g, `color={themeColor}`],
    [/'4px solid #722ed1'/g, '`4px solid ${themeColor}`'],
    [/"4px solid #722ed1"/g, '`4px solid ${themeColor}`'],
    [/'3px solid #722ed1'/g, '`3px solid ${themeColor}`'],
    [/"3px solid #722ed1"/g, '`3px solid ${themeColor}`'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changes.push(`replaced ${pattern.source}`);
    }
  }

  if (changes.length > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFiles++;
    console.log(`✅ ${dir}: ${changes.join(', ')}`);
  } else {
    console.log(`⏭  ${dir}: no changes needed`);
  }
}

console.log(`\n📊 Result: ${modifiedFiles}/${totalFiles} files modified`);
