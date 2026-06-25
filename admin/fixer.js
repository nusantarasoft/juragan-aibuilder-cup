const fs = require('fs');
const file = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/inventory/warehouse-map/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('                    {/* Right: Properties panel (when object selected in build mode) */}');
const endStr = '                                </Card>\n                            </motion.div>\n                        )}\n                    </AnimatePresence>';
const endStrIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex === -1 || endStrIndex < startIndex) {
    console.log('Error finding block', startIndex, endStrIndex);
    process.exit(1);
}

const block = content.substring(startIndex, endStrIndex);
content = content.substring(0, startIndex) + content.substring(endStrIndex);

const insertTarget = '                                    </div>\n                                )}\n';
const insertIndex = content.indexOf(insertTarget);

if (insertIndex === -1) {
    console.log('Error finding insert target');
    process.exit(1);
}

let cleanBlock = block;
cleanBlock = cleanBlock.replace(/<AnimatePresence>/g, '');
cleanBlock = cleanBlock.replace(/<\/AnimatePresence>/g, '');
cleanBlock = cleanBlock.replace(/<motion\.div[^>]+>/, '<div style={{ flex: 1, overflowY: "auto" }}>');
cleanBlock = cleanBlock.replace(/<\/motion\.div>/g, '</div>');
cleanBlock = cleanBlock.replace(/buildMode && selectedObj &&/g, 'selectedObj &&');

content = content.substring(0, insertIndex + insertTarget.length) + '\n' + cleanBlock + '\n' + content.substring(insertIndex + insertTarget.length);

fs.writeFileSync(file, content);
console.log('Done!');
