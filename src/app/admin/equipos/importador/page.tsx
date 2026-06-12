"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, FileUp, CheckCircle, AlertCircle, ArrowLeft, Users } from "lucide-react";
import { toast } from "react-hot-toast";

interface Season {
  id: string;
  name: string;
  is_active: boolean;
}

interface CsvRow {
  Equipo: string;
  Nombre: string;
  Apellidos: string;
  Dorsal?: string;
  Posicion?: string;
  "Tutor Legal"?: string;
}

export default function ImportadorEquiposPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  
  // Novedad: Equipos existentes y equipo por defecto
  const [existingTeams, setExistingTeams] = useState<{id: string, name: string}[]>([]);
  const [defaultTeamName, setDefaultTeamName] = useState<string>("");

  useEffect(() => {
    checkActiveSeasonAndTeams();
  }, []);

  const checkActiveSeasonAndTeams = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
    if (!profile?.club_id) return;
    setClubId(profile.club_id);

    const { data: season } = await supabase
      .from('seasons')
      .select('id, name, is_active')
      .eq('club_id', profile.club_id)
      .eq('is_active', true)
      .single();

    if (season) {
      setActiveSeason(season);
      
      // Cargar los equipos existentes para el selector
      const { data: teams } = await supabase
        .from('equipos')
        .select('id, name')
        .eq('club_id', profile.club_id)
        .order('name');
        
      if (teams) {
        setExistingTeams(teams);
      }
    }
  };

  // Re-procesar los datos si cambia el equipo por defecto
  useEffect(() => {
    if (file) {
      parseFile(file);
    }
  }, [defaultTeamName]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (selectedFile: File) => {

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        // En Excel España el delimitador suele ser punto y coma. PapaParse suele autodetectarlo,
        // pero normalizamos los headers por si hay espacios
        const rows = results.data as Record<string, string>[];
        
        // Mapeo flexible de nombres de columnas
        const mappedData = rows.map(row => {
          // Buscar columna "Equipo" o similar. Si no existe, usamos el seleccionado por defecto.
          let equipo = row["Equipo"] || row["EQUIPO"] || row["equipo"] || row["Club"] || "";
          if (!equipo && defaultTeamName) {
            equipo = defaultTeamName;
          }
          
          const nombre = row["Nombre"] || row["NOMBRE"] || row["nombre"] || row["Jugador"] || row["JUGADOR"] || "";
          const apellidos = row["Apellidos"] || row["APELLIDOS"] || row["apellidos"] || "";
          const dorsal = row["N° de camiseta"] || row["Nº de camiseta"] || row["Dorsal"] || row["DORSAL"] || row["dorsal"] || "";
          const posicion = row["Posición"] || row["Posicion"] || row["Rol"] || row["POSICION"] || row["posicion"] || "";
          
          // Intentar parsear fecha de nacimiento si existe
          let birthDate = row["Fecha de nacimiento"] || row["Fecha Nacimiento"] || row["Nacimiento"] || "";
          
          // Separar contacto propio vs padres
          const telefonoPropio = row["Teléfono"] || row["Telefono"] || "";
          const emailPropio = row["Correo electrónico"] || row["Email"] || "";

          // Construir contacto del padre uniendo el nombre, teléfono y email si existen
          const padre1Tel = row["Padre 1 Teléfono"] || "";
          const padre1Email = row["Padre 1 Correo electrónico"] || "";
          const padre1Nombre = row["Padre 1 Nombre"] || "";
          const padre1Apellidos = row["Padre 1 Apellido(s)"] || "";
          
          const padre2Tel = row["Padre 2 Teléfono"] || "";
          const padre2Email = row["Padre 2 Correo electrónico"] || "";
          const padre2Nombre = row["Padre 2 Nombre"] || "";
          const padre2Apellidos = row["Padre 2 Apellido(s)"] || "";
          
          let tutor = row["Tutor Legal"] || row["TUTOR"] || row["Tutor"] || "";
          if (!tutor && (padre1Nombre || padre1Tel || padre1Email)) {
            tutor = `${padre1Nombre} ${padre1Tel} ${padre1Email}`.trim();
          }

          // Otros campos extendidos
          const apodo = row["Apodo"] || "";
          const añoLlegada = row["Año de llegada"] || "";
          const licencia = row["N° de licencia"] || row["Nº de licencia"] || row["Licencia"] || "";

          return {
            Equipo: equipo,
            Nombre: nombre,
            Apellidos: apellidos,
            Dorsal: dorsal,
            Posicion: posicion,
            "Tutor Legal": tutor,
            Email: emailPropio,
            Telefono: telefonoPropio,
            // Campos extendidos
            Apodo: apodo,
            AnioLlegada: añoLlegada,
            Licencia: licencia,
            Padre1Nombre: padre1Nombre,
            Padre1Apellidos: padre1Apellidos,
            Padre1Email: padre1Email,
            Padre1Tel: padre1Tel,
            Padre2Nombre: padre2Nombre,
            Padre2Apellidos: padre2Apellidos,
            Padre2Email: padre2Email,
            Padre2Tel: padre2Tel,
            // Guardamos temporalmente la fecha original en un campo extra
            FechaNacimiento: birthDate
          } as any;
        }).filter(r => r.Equipo || r.Nombre); // Filtrar filas completamente vacías

        setPreviewData(mappedData);
      },
      error: (error) => {
        toast.error("Error al leer el archivo: " + error.message);
      }
    });
  };

  const handleImport = async () => {
    if (!clubId) {
      toast.error("Error de autenticación. No se encontró tu Club.");
      return;
    }
    if (!activeSeason) {
      toast.error("No hay ninguna Temporada activa. Ve a 'Temporadas' y activa una primero.");
      return;
    }
    if (previewData.length === 0) {
      toast.error("El archivo está vacío o no se ha podido leer correctamente.");
      return;
    }

    setIsImporting(true);
    const supabase = createClient();

    try {
      const formatBirthDate = (dateStr: string) => {
        if (!dateStr) return null;
        // Si viene como DD/MM/YYYY
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // asumiendo DD/MM/YYYY o DD/MM/YY
            let year = parts[2];
            if (year.length === 2) {
               // heuristics for 2000s vs 1900s
               year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
            }
            return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        // Si viene como YYYY-MM-DD u otro formato estándar, intentamos validarlo
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
        return null; // fallback
      };

      // 1. Agrupar por equipos
      const teamsMap = new Map<string, any[]>();
      previewData.forEach((row: any) => {
        const teamName = row.Equipo?.trim();
        if (!teamName) return;
        if (!teamsMap.has(teamName)) {
          teamsMap.set(teamName, []);
        }
        teamsMap.get(teamName)?.push(row);
      });

      let teamsCreated = 0;
      let playersCreated = 0;

      // 2. Procesar cada equipo
      for (const [teamName, players] of teamsMap.entries()) {
        // Buscar si el equipo ya existe en el club, independientemente de la temporada
        // para re-aprovecharlo si fue creado antes del sistema de temporadas.
        const { data: existingTeam } = await supabase
          .from('equipos')
          .select('id')
          .eq('club_id', clubId)
          .eq('name', teamName)
          .maybeSingle();

        let teamId = existingTeam?.id;

        // Filtrar y separar entrenadores de jugadores
        let numCoaches = 0;
        let numPlayers = 0;
        
        players.forEach(p => {
          const pos = p.Posicion?.toLowerCase() || "";
          if (pos.includes('entrenador') || pos.includes('delegado') || pos.includes('técnico')) {
            numCoaches++;
          } else {
            numPlayers++;
          }
        });

        if (teamId) {
           // Actualizar el equipo para asignarlo a esta temporada si no lo estaba
           // Y actualizar contadores agregando los nuevos a los que ya hubiera (o sobrescribiendo si lo prefieres,
           // pero como es un importador masivo es mejor establecer los contadores exactos de este lote)
           await supabase.from('equipos')
            .update({ 
              season_id: activeSeason.id,
              members: numPlayers,
              coaches: numCoaches
            })
            .eq('id', teamId);
        } else {
          // Crear el equipo con todos los campos obligatorios
          const { data: newTeam, error: teamError } = await supabase
            .from('equipos')
            .insert({
              club_id: clubId,
              season_id: activeSeason.id,
              name: teamName,
              category: "General",
              sport: "Fútbol",
              gender: "Masculino",
              age_group: "Adultos", // required
              format: "Fútbol 11",  // required
              color: "#1E40AF",     // required
              members: numPlayers,
              coaches: numCoaches
            })
            .select('id')
            .single();

          if (teamError) throw new Error(teamError.message || JSON.stringify(teamError));
          teamId = newTeam.id;
          teamsCreated++;
        }

        // 3. Crear jugadores y asignarlos
        const playersToInsert = players.map(p => {
          const d = parseInt(p.Dorsal);
          const y = parseInt(p.AnioLlegada);
          
          return {
            club_id: clubId,
            team_id: teamId,
            first_name: p.Nombre?.trim() || "Sin Nombre",
            last_name: p.Apellidos?.trim() || "",
            dorsal: isNaN(d) ? null : d,
            posicion: p.Posicion?.trim() || "Jugador",
            parent_contact: p["Tutor Legal"]?.trim() || "Pendiente",
            email: p.Email?.trim() || null,
            phone: p.Telefono?.trim() || null,
            birth_date: formatBirthDate(p.FechaNacimiento),
            // Campos extendidos
            nickname: p.Apodo?.trim() || null,
            join_year: isNaN(y) ? null : y,
            license_number: p.Licencia?.trim() || null,
            parent1_name: p.Padre1Nombre?.trim() || null,
            parent1_last_name: p.Padre1Apellidos?.trim() || null,
            parent1_email: p.Padre1Email?.trim() || null,
            parent1_phone: p.Padre1Tel?.trim() || null,
            parent2_name: p.Padre2Nombre?.trim() || null,
            parent2_last_name: p.Padre2Apellidos?.trim() || null,
            parent2_email: p.Padre2Email?.trim() || null,
            parent2_phone: p.Padre2Tel?.trim() || null,
          };
        });

        if (playersToInsert.length > 0) {
          const { data: insertedPlayers, error: playersError } = await supabase
            .from('players')
            .insert(playersToInsert)
            .select('id');

          if (playersError) throw new Error(playersError.message || JSON.stringify(playersError));

          // 4. Crear el historial de temporada para los jugadores
          if (insertedPlayers) {
            const historyToInsert = insertedPlayers.map(ip => ({
              player_id: ip.id,
              season_id: activeSeason.id,
              team_id: teamId,
              club_id: clubId
            }));

            await supabase.from('player_season_teams').insert(historyToInsert);
            playersCreated += historyToInsert.length;
          }
        }
      }

      toast.success(`Importación exitosa: ${teamsCreated} equipos nuevos y ${playersCreated} jugadores registrados.`);
      
      // Limpiar formulario y archivo
      setFile(null);
      setPreviewData([]);
      // Solo hacer push después de un momento
      setTimeout(() => {
        router.push('/dashboard/equipos');
      }, 1000);
      
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error("Error en la importación: " + errorMsg);
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Importador de Equipos</h1>
          <p className="text-gray-500 mt-1">Sube un archivo Excel/CSV para crear equipos y jugadores masivamente.</p>
        </div>
      </div>

      {!activeSeason ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <h3 className="text-lg font-bold text-red-800">¡Atención! No hay ninguna temporada activa</h3>
          <p className="text-red-700 mt-2 max-w-md">
            Para poder importar jugadores, necesitas que el club tenga una Temporada Activa configurada en el sistema.
          </p>
          <button 
            onClick={() => router.push('/admin/temporadas')}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            Ir a Configurar Temporadas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel Izquierdo: Subida y Resumen */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileUp size={18} className="text-blue-600" />
                Subir Archivo
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative">
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="font-medium text-slate-700">Haz clic o arrastra un archivo CSV</p>
                <p className="text-xs text-gray-500 mt-1">Solo formato .csv delimitado por comas</p>
              </div>

              {file && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="text-green-500 shrink-0" size={20} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-green-900 truncate">{file.name}</p>
                    <p className="text-xs text-green-700">{previewData.length} filas detectadas</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Equipo por Defecto (Opcional)</h3>
              <p className="text-sm text-gray-500 mb-4">
                Si tu Excel no tiene una columna "Equipo", puedes seleccionar aquí a qué equipo asignar a todos los jugadores del archivo. 
                Si lo dejas en blanco y no hay columna, los creará como un equipo nuevo o dará error.
              </p>
              
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Escribe o selecciona un equipo..."
                  list="equipos-existentes"
                  value={defaultTeamName}
                  onChange={(e) => setDefaultTeamName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                />
                <datalist id="equipos-existentes">
                  {existingTeams.map(t => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-3">Información de Destino</h3>
              <ul className="space-y-3 text-sm text-blue-800">
                <li className="flex items-center justify-between">
                  <span>Temporada Destino:</span>
                  <span className="font-bold bg-white px-2 py-1 rounded shadow-sm">{activeSeason.name}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Equipos Detectados:</span>
                  <span className="font-bold bg-white px-2 py-1 rounded shadow-sm">
                    {new Set(previewData.map(r => r.Equipo)).size}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Jugadores a Importar:</span>
                  <span className="font-bold bg-white px-2 py-1 rounded shadow-sm">{previewData.length}</span>
                </li>
              </ul>

              <button
                onClick={handleImport}
                disabled={previewData.length === 0 || isImporting || previewData.some(r => !r.Equipo || r.Equipo === "Falta")}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold shadow-md transition-all flex justify-center items-center gap-2"
              >
                {isImporting ? 'Importando datos...' : (
                  <>
                    <Upload size={18} />
                    Comenzar Importación
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Panel Derecho: Vista previa de datos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-gray-500" />
                  Vista Previa de Datos
                </h3>
                {previewData.length > 0 && (
                  <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded font-medium text-gray-600">
                    Mostrando primeras {Math.min(previewData.length, 100)} filas
                  </span>
                )}
              </div>
              
              <div className="p-0 overflow-auto flex-1 max-h-[600px]">
                {previewData.length === 0 ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
                    <p>No se han cargado datos aún.</p>
                    <p className="text-sm mt-1">Sube un archivo para previsualizar las columnas requeridas:</p>
                    <div className="flex gap-2 mt-4 text-xs font-mono bg-gray-100 p-3 rounded text-slate-600">
                      <span>Equipo</span> | <span>Nombre</span> | <span>Apellidos</span> | <span>Dorsal</span> | <span>Posicion</span>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-white sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="p-3 border-b text-gray-500 font-medium whitespace-nowrap">Equipo</th>
                        <th className="p-3 border-b text-gray-500 font-medium whitespace-nowrap">Nombre</th>
                        <th className="p-3 border-b text-gray-500 font-medium whitespace-nowrap">Apellidos</th>
                        <th className="p-3 border-b text-gray-500 font-medium whitespace-nowrap">Posición</th>
                        <th className="p-3 border-b text-gray-500 font-medium whitespace-nowrap">Dorsal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewData.slice(0, 100).map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/50">
                          <td className="p-3 whitespace-nowrap font-medium text-slate-800">{row.Equipo || <span className="text-red-400">Falta</span>}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{row.Nombre || <span className="text-red-400">Falta</span>}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{row.Apellidos || '-'}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{row.Posicion || '-'}</td>
                          <td className="p-3 whitespace-nowrap text-slate-600">{row.Dorsal || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
