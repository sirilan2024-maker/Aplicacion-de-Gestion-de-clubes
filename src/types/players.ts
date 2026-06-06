export interface RelacionFamilia {
  id?: string;
  player_id: string;
  usuario_id?: string | null;
  tutor1_nombre: string;
  tutor1_telefono: string;
  tutor1_email?: string | null;
  tutor2_nombre?: string | null;
  tutor2_telefono?: string | null;
  descuento_hermanos: boolean;
  created_at?: string;
}

export interface FichaMedica {
  id?: string;
  player_id: string;
  alergias?: string | null;
  enfermedades?: string | null;
  medicacion?: string | null;
  grupo_sanguineo?: string | null;
  created_at?: string;
}

export interface Autorizacion {
  id?: string;
  player_id: string;
  tipo_autorizacion: string;
  firmado: boolean;
  created_at?: string;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  team_id?: string | null;
  dni?: string | null;
  num_licencia_fed?: string | null;
  posicion_principal?: string | null;
  created_at: string;

  // Relaciones
  familias?: RelacionFamilia[];
  ficha_medica?: FichaMedica;
  autorizaciones?: Autorizacion[];
}
