const fs = require('fs');
// Check if fees table is used and what treasury component looks like
const treasuryComp = fs.readFileSync('src/components/features/treasury/TreasuryDashboard.tsx', 'utf8');
// Print first 100 lines
console.log(treasuryComp.split('\n').slice(0, 60).join('\n'));
