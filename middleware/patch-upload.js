const fs = require('fs');
let code = fs.readFileSync('/app/dist/studio/ragflow.service.js', 'utf-8');

// Replace old FormData require pattern
code = code.replace(
    "const FormData = require('form-data');\n        const formData = new FormData();\n        formData.append('file', fileBuffer, { filename });",
    "const formData = new FormData();\n        const blob = new Blob([fileBuffer]);\n        formData.append('file', blob, filename);"
);

// Remove formData.getHeaders()
code = code.replace("...formData.getHeaders(),\n", "");

fs.writeFileSync('/app/dist/studio/ragflow.service.js', code);
console.log('Patched successfully');
