const fs = require('fs');
let code = fs.readFileSync('/app/dist/studio/ragflow.service.js', 'utf-8');

// Fix chat model name
code = code.replace(
    "model_name: ''",
    "model_name: 'gemini-2.0-flash@Gemini'"
);

fs.writeFileSync('/app/dist/studio/ragflow.service.js', code);
console.log('Patched model_name successfully');
