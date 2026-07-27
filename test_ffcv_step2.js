const fs = require('fs');
const content = fs.readFileSync('src/components/features/registration/steps/Step2Documents.tsx', 'utf8');
console.log(content.includes('FFCV'));
console.log(content.includes('Extranjera'));
