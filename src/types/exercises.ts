export type CategoriaEdad = 'prebenjamin' | 'benjamin' | 'alevin' | 'infantil' | 'cadete' | 'juvenil' | 'senior';

export interface Ejercicio {
  id: string;
  club_id: string;
  nombre: string;
  tipo: string;
  objetivo_tecnico: string[];
  objetivo_tactico: string[];
  categoria_edad: CategoriaEdad[];
  duracion_recomendada: number | null;
  material: string[];
  descripcion: string | null;
  variantes: string[];
  puntos_entrenamiento: string | null;
  imagen_url: string | null;
  video_url: string | null;
  tags: string[];
  dificultad: number;
  created_at: string;
}

export interface SesionEjercicio {
  id: string;
  session_id: string;
  ejercicio_id: string;
  orden: number;
  duracion_bloque: number | null;
  created_at: string;
  
  // Relacion para consultas
  ejercicio?: Ejercicio;
}
