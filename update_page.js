const fs = require('fs');
const file = 'src/app/admin/temporadas/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Import server actions
code = code.replace(
  'import { toast } from "react-hot-toast";',
  'import { toast } from "react-hot-toast";\nimport { closeSeason, reopenSeason } from "@/app/actions/season-actions";'
);
// Import Unlock icon
code = code.replace(
  'Trash2 } from "lucide-react";',
  'Trash2, Unlock } from "lucide-react";'
);

// Add isAdmin state
code = code.replace(
  'const [clubId, setClubId] = useState<string | null>(null);',
  'const [clubId, setClubId] = useState<string | null>(null);\n  const [isAdmin, setIsAdmin] = useState(false);'
);

// Fetch role
code = code.replace(
  "select('club_id').eq('id', user.id).single();",
  "select('club_id, role').eq('id', user.id).single();"
);
code = code.replace(
  "setClubId(profile.club_id);",
  "setClubId(profile.club_id);\n    setIsAdmin(profile.role === 'admin');"
);

// Update handleCloseSeason
code = code.replace(
  /const handleCloseSeason = async[^{]+\{[\s\S]+?fetchData\(\);\n    \}\n  \};/m,
  \const handleCloseSeason = async (season: Season) => {
    const daysLeft = Math.ceil(
      (new Date(season.end_date).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)
    );
    const msg = daysLeft > 0
      ? \\\¿Estás seguro de que quieres CERRAR la temporada "\\\"? Quedan \\\ días. Los datos quedarán archivados y no se podrán editar.\\\
      : \\\¿Estás seguro de que quieres CERRAR la temporada "\\\"? Los datos quedarán archivados.\\\;
    if (!confirm(msg)) return;

    try {
      await closeSeason(season.id);
      toast.success(\\\Temporada cerrada y archivada.\\\);
      fetchData();
    } catch(e: any) {
      toast.error('Error al cerrar la temporada: ' + e.message);
    }
  };\n
  const handleReopenSeason = async (seasonId: string) => {
    if (!confirm("ADVERTENCIA (Llave Maestra): ¿Estás seguro de que quieres REABRIR esta temporada para editar datos históricos?")) return;
    try {
      await reopenSeason(seasonId);
      toast.success("Temporada reabierta. El candado ha sido retirado.");
      fetchData();
    } catch(e: any) {
      toast.error("Error al reabrir la temporada: " + e.message);
    }
  };\n\
);

// Update rendering logic
const renderReplacement = \
                {season.is_active ? (
                  <button
                    onClick={() => handleCloseSeason(season)}
                    className="flex-1 md:flex-none text-center flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Lock size={14} />
                    Cerrar Temporada
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleSetActive(season.id)}
                      className="flex-1 md:flex-none text-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Establecer como Activa
                    </button>
                    {!season.name.includes('??') && isAdmin && (
                      <button
                        onClick={() => handleReopenSeason(season.id)}
                        className="flex-1 md:flex-none text-center flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                        title="Llave Maestra: Reabrir para editar"
                      >
                        <Unlock size={14} />
                        Reabrir Temporada
                      </button>
                    )}
                    {season.name.includes('??') && isAdmin && (
                      <button
                        onClick={() => handleCloseSeason(season)}
                        className="flex-1 md:flex-none text-center flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Lock size={14} />
                        Bloquear de Nuevo
                      </button>
                    )}
                  </>
                )}
\;

code = code.replace(
  /\{\s*season\.is_active \? \([\s\S]+?Establecer como Activa\n\s*<\/button>\n\s*\)\s*\}/m,
  renderReplacement.trim()
);

fs.writeFileSync(file, code);
console.log('updated page.tsx');
