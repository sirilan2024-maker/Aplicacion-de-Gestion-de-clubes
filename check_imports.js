const fs = require('fs');
const content = fs.readFileSync('src/components/features/registration/RegistrationWizard.tsx', 'utf8');
const imports = content.split('\n').filter(line => line.startsWith('import'));
console.log(imports);
