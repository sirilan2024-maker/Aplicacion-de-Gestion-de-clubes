process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const content = fs.readFileSync('src/components/features/registration/RegistrationWizard.tsx', 'utf8');

// Find file upload fields
const fileFields = content.match(/label:.*?Archivo.*?/gi) || content.match(/label:.*?(DNI|Foto|Certificado).*?/gi);
console.log("File fields mentioned in code:", fileFields);
