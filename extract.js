const { execSync } = require('child_process');
const fs = require('fs');

try {
  const commit = execSync('git log --before="2026-06-16" -1 --format="%H"').toString().trim();
  const oldFile = execSync(`git show ${commit}:src/app/dashboard/equipos/[teamId]/entrenamientos/[eventId]/page.tsx`, { encoding: 'utf-8' });
  fs.writeFileSync('old_page.tsx', oldFile);
  console.log('Saved old file');
} catch (e) {
  console.log(e.message);
}
