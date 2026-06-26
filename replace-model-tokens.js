const fs = require('fs');
let content = fs.readFileSync('src/app/api/asistente-ia/route.ts', 'utf-8');

// FASE 1 SQL:
content = content.replace(/model: 'llama-3.1-8b-instant',\s*temperature: 0.1,\s*max_tokens: 2000,\s*response_format: { type: 'json_object' }/g, 
"model: 'llama-3.1-8b-instant',\n      temperature: 0.1,\n      max_tokens: 800,\n      response_format: { type: 'json_object' }");

// FASE 3 Chart: We need to just string replace the second one carefully if the regex matched both.
// Let's just read and replace specifically.
content = content.replace(/max_tokens: 800/g, "max_tokens: 1000"); // set both to 1000 to be safe and under 6000 combined

fs.writeFileSync('src/app/api/asistente-ia/route.ts', content);
