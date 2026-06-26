const fs = require('fs');
let content = fs.readFileSync('src/app/api/asistente-ia/route.ts', 'utf-8');
content = content.replace(/model: 'qwen\/qwen3-32b'/g, "model: 'llama-3.1-8b-instant'");
content = content.replace(/max_tokens: 8000,/g, "max_tokens: 2000,");
fs.writeFileSync('src/app/api/asistente-ia/route.ts', content);
