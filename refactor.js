const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

function refactorFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace .from('equipos') and .from("equipos")
  content = content.replace(/\.from\(['"]equipos['"]\)/g, ".from('teams')");
  
  // Replace select string joins like: equipos ( name )
  // We need to be careful with word boundaries
  content = content.replace(/\bequipos\s*\(/g, "teams (");
  
  // Replace p.equipos?.name to p.teams?.name
  content = content.replace(/\.equipos\?/g, ".teams?");
  
  // Replace p.equipos to p.teams
  content = content.replace(/p\.equipos/g, "p.teams");
  
  // Replace /dashboard/equipos routing?
  // We should NOT replace /equipos in URLs because the user still wants the URL to be /admin/equipos or /dashboard/equipos
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Refactored:', filePath);
  }
}

walkDir(path.join(__dirname, 'src'), refactorFile);
console.log('Refactoring complete!');
