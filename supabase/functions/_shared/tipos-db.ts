export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      equipo: {
        Row: {
          color_primario: string | null
          color_texto: string | null
          escudo_url: string
          id: number
          nombre: string
          nombre_corto: string
          proveedor_id: number
        }
        Insert: {
          color_primario?: string | null
          color_texto?: string | null
          escudo_url: string
          id?: never
          nombre: string
          nombre_corto: string
          proveedor_id: number
        }
        Update: {
          color_primario?: string | null
          color_texto?: string | null
          escudo_url?: string
          id?: never
          nombre?: string
          nombre_corto?: string
          proveedor_id?: number
        }
        Relationships: []
      }
      estadistica_partido: {
        Row: {
          equipo_id: number
          id: number
          partido_id: number
          tipo: string
          valor: string | null
        }
        Insert: {
          equipo_id: number
          id?: never
          partido_id: number
          tipo: string
          valor?: string | null
        }
        Update: {
          equipo_id?: number
          id?: never
          partido_id?: number
          tipo?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estadistica_partido_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estadistica_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partido"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_partido: {
        Row: {
          detalle: string
          equipo_id: number
          id: number
          minuto: number
          minuto_agregado: number | null
          partido_id: number
          tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Insert: {
          detalle: string
          equipo_id: number
          id?: never
          minuto: number
          minuto_agregado?: number | null
          partido_id: number
          tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Update: {
          detalle?: string
          equipo_id?: number
          id?: never
          minuto?: number
          minuto_agregado?: number | null
          partido_id?: number
          tipo?: Database["public"]["Enums"]["tipo_evento"]
        }
        Relationships: [
          {
            foreignKeyName: "evento_partido_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partido"
            referencedColumns: ["id"]
          },
        ]
      }
      jornada: {
        Row: {
          esta_cerrada: boolean
          fase: Database["public"]["Enums"]["fase_jornada"]
          fecha_fin: string
          fecha_inicio: string
          id: number
          nombre: string
          nombres_proveedor: string[]
          orden: number
          torneo_id: number
        }
        Insert: {
          esta_cerrada?: boolean
          fase: Database["public"]["Enums"]["fase_jornada"]
          fecha_fin: string
          fecha_inicio: string
          id?: never
          nombre: string
          nombres_proveedor: string[]
          orden: number
          torneo_id: number
        }
        Update: {
          esta_cerrada?: boolean
          fase?: Database["public"]["Enums"]["fase_jornada"]
          fecha_fin?: string
          fecha_inicio?: string
          id?: never
          nombre?: string
          nombres_proveedor?: string[]
          orden?: number
          torneo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "jornada_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneo"
            referencedColumns: ["id"]
          },
        ]
      }
      liga: {
        Row: {
          id: number
          nombre: string
          pais: string
          proveedor_id: number
        }
        Insert: {
          id?: never
          nombre: string
          pais: string
          proveedor_id: number
        }
        Update: {
          id?: never
          nombre?: string
          pais?: string
          proveedor_id?: number
        }
        Relationships: []
      }
      partido: {
        Row: {
          calificado_en: string | null
          equipo_local_id: number
          equipo_visitante_id: number
          es_simulado: boolean
          estado: Database["public"]["Enums"]["estado_partido"]
          goles_local: number | null
          goles_local_medio_tiempo: number | null
          goles_visitante: number | null
          goles_visitante_medio_tiempo: number | null
          id: number
          inicio: string
          jornada_id: number
          partido_origen_id: number | null
          proveedor_id: number | null
          sincronizado_en: string
          torneo_id: number
        }
        Insert: {
          calificado_en?: string | null
          equipo_local_id: number
          equipo_visitante_id: number
          es_simulado?: boolean
          estado?: Database["public"]["Enums"]["estado_partido"]
          goles_local?: number | null
          goles_local_medio_tiempo?: number | null
          goles_visitante?: number | null
          goles_visitante_medio_tiempo?: number | null
          id?: never
          inicio: string
          jornada_id: number
          partido_origen_id?: number | null
          proveedor_id?: number | null
          sincronizado_en: string
          torneo_id: number
        }
        Update: {
          calificado_en?: string | null
          equipo_local_id?: number
          equipo_visitante_id?: number
          es_simulado?: boolean
          estado?: Database["public"]["Enums"]["estado_partido"]
          goles_local?: number | null
          goles_local_medio_tiempo?: number | null
          goles_visitante?: number | null
          goles_visitante_medio_tiempo?: number | null
          id?: never
          inicio?: string
          jornada_id?: number
          partido_origen_id?: number | null
          proveedor_id?: number | null
          sincronizado_en?: string
          torneo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "partido_equipo_local_id_fkey"
            columns: ["equipo_local_id"]
            isOneToOne: false
            referencedRelation: "equipo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_equipo_visitante_id_fkey"
            columns: ["equipo_visitante_id"]
            isOneToOne: false
            referencedRelation: "equipo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_partido_origen_id_fkey"
            columns: ["partido_origen_id"]
            isOneToOne: false
            referencedRelation: "partido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partido_torneo_id_fkey"
            columns: ["torneo_id"]
            isOneToOne: false
            referencedRelation: "torneo"
            referencedColumns: ["id"]
          },
        ]
      }
      sincronizacion: {
        Row: {
          consultas_usadas: number
          error: string | null
          estado: Database["public"]["Enums"]["estado_sincronizacion"]
          fin: string | null
          id: number
          inicio: string
          tipo: Database["public"]["Enums"]["tipo_sincronizacion"]
        }
        Insert: {
          consultas_usadas?: number
          error?: string | null
          estado?: Database["public"]["Enums"]["estado_sincronizacion"]
          fin?: string | null
          id?: never
          inicio?: string
          tipo: Database["public"]["Enums"]["tipo_sincronizacion"]
        }
        Update: {
          consultas_usadas?: number
          error?: string | null
          estado?: Database["public"]["Enums"]["estado_sincronizacion"]
          fin?: string | null
          id?: never
          inicio?: string
          tipo?: Database["public"]["Enums"]["tipo_sincronizacion"]
        }
        Relationships: []
      }
      torneo: {
        Row: {
          es_actual: boolean
          fecha_fin: string
          fecha_inicio: string
          id: number
          liga_id: number
          nombre: string
          prefijo_rondas: string
          temporada_proveedor: number
        }
        Insert: {
          es_actual?: boolean
          fecha_fin: string
          fecha_inicio: string
          id?: never
          liga_id: number
          nombre: string
          prefijo_rondas: string
          temporada_proveedor: number
        }
        Update: {
          es_actual?: boolean
          fecha_fin?: string
          fecha_inicio?: string
          id?: never
          liga_id?: number
          nombre?: string
          prefijo_rondas?: string
          temporada_proveedor?: number
        }
        Relationships: [
          {
            foreignKeyName: "torneo_liga_id_fkey"
            columns: ["liga_id"]
            isOneToOne: false
            referencedRelation: "liga"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_partido:
        | "PROGRAMADO"
        | "EN_JUEGO"
        | "TERMINADO"
        | "POSPUESTO"
        | "CANCELADO"
      estado_sincronizacion:
        | "EN_CURSO"
        | "EXITO"
        | "ERROR"
        | "DETENIDA_POR_TOPE"
      fase_jornada: "REGULAR" | "LIGUILLA"
      tipo_evento: "GOL" | "TARJETA" | "CAMBIO" | "VAR"
      tipo_sincronizacion:
        | "CARGA_INICIAL"
        | "ACTUALIZACION_DIARIA"
        | "DETECCION_FINALES"
        | "DATOS_PARTIDO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_partido: [
        "PROGRAMADO",
        "EN_JUEGO",
        "TERMINADO",
        "POSPUESTO",
        "CANCELADO",
      ],
      estado_sincronizacion: [
        "EN_CURSO",
        "EXITO",
        "ERROR",
        "DETENIDA_POR_TOPE",
      ],
      fase_jornada: ["REGULAR", "LIGUILLA"],
      tipo_evento: ["GOL", "TARJETA", "CAMBIO", "VAR"],
      tipo_sincronizacion: [
        "CARGA_INICIAL",
        "ACTUALIZACION_DIARIA",
        "DETECCION_FINALES",
        "DATOS_PARTIDO",
      ],
    },
  },
} as const
