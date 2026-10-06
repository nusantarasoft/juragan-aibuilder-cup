const fs = require('fs');
const parser = require('@babel/parser');
const original = fs.readFileSync('src/app/admin/inventory/warehouse-map/page.tsx', 'utf-8');

const prefix = original.substring(0, original.indexOf('                                </GlassPanel>'));
const suffix = original.substring(original.indexOf('    );\n}\n\n// ═══ WMS Activity Feed for 3D Map ═══'));

const base_closure = `
                                </GlassPanel>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
`;

const candidates = [
    '</div></div>',
    '</div></div></div>',
    '</div></div></div></div>',
    '</div></div></div></div></div>',
    '</div></div></div></div></div></div>',
    '</div></div></div></div></div></div></div>',
];

for(const tags of candidates) {
    const code = prefix + base_closure + tags + '\n' + suffix;
    try {
        parser.parse(code, {sourceType: 'module', plugins: ['jsx', 'typescript']});
        console.log('SUCCESS:', tags);
        break;
    } catch(e) {
        console.log('FAILED:', tags, e.message);
    }
}
