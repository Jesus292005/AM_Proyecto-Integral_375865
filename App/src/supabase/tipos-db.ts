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
      calificacion: {
        Row: {
          calificada_en: string
          es_simulada: boolean
          id: number
          prediccion_id: number
          puntos_base: number | null
          puntos_marcador: number
          puntos_rango_goles: number
          puntos_resultado: number
        }
        Insert: {
          calificada_en?: string
          es_simulada: boolean
          id?: never
          prediccion_id: number
          puntos_base?: never
          puntos_marcador: number
          puntos_rango_goles: number
          puntos_resultado: number
        }
        Update: {
          calificada_en?: string
          es_simulada?: boolean
          id?: never
          prediccion_id?: number
          puntos_base?: never
          puntos_marcador?: number
          puntos_rango_goles?: number
          puntos_resultado?: number
        }
        Relationships: [
          {
            foreignKeyName: "calificacion_prediccion_id_fkey"
            columns: ["prediccion_id"]
            isOneToOne: true
            referencedRelation: "mis_puntos"
            referencedColumns: ["prediccion_id"]
          },
          {
            foreignKeyName: "calificacion_prediccion_id_fkey"
            columns: ["prediccion_id"]
            isOneToOne: true
            referencedRelation: "prediccion"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivo: {
        Row: {
          actualizado_en: string
          id: number
          token: string
          usuario_id: string
        }
        Insert: {
          actualizado_en?: string
          id?: never
          token: string
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          id?: never
          token?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario_publico"
            referencedColumns: ["id"]
          },
        ]
      }
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
      evaluacion_ia: {
        Row: {
          afirmaciones: NonNullable<Json>
          creada_en: string
          error: string | null
          es_simulada: boolean
          estado: Database["public"]["Enums"]["estado_evaluacion"]
          evaluada_en: string | null
          explicacion: string | null
          id: number
          intentos: number
          modelo: string | null
          prediccion_id: number
          puntos_bono: number | null
          siguiente_intento_en: string
          version_prompt: string | null
        }
        Insert: {
          afirmaciones?: NonNullable<Json>
          creada_en?: string
          error?: string | null
          es_simulada: boolean
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          evaluada_en?: string | null
          explicacion?: string | null
          id?: never
          intentos?: number
          modelo?: string | null
          prediccion_id: number
          puntos_bono?: number | null
          siguiente_intento_en?: string
          version_prompt?: string | null
        }
        Update: {
          afirmaciones?: NonNullable<Json>
          creada_en?: string
          error?: string | null
          es_simulada?: boolean
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          evaluada_en?: string | null
          explicacion?: string | null
          id?: never
          intentos?: number
          modelo?: string | null
          prediccion_id?: number
          puntos_bono?: number | null
          siguiente_intento_en?: string
          version_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_ia_prediccion_id_fkey"
            columns: ["prediccion_id"]
            isOneToOne: true
            referencedRelation: "mis_puntos"
            referencedColumns: ["prediccion_id"]
          },
          {
            foreignKeyName: "evaluacion_ia_prediccion_id_fkey"
            columns: ["prediccion_id"]
            isOneToOne: true
            referencedRelation: "prediccion"
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
      llamada_ia: {
        Row: {
          detalle: string | null
          evaluacion_id: number | null
          id: number
          inicio: string
          modelo: string
          resultado: string
          tokens_entrada: number | null
          tokens_salida: number | null
        }
        Insert: {
          detalle?: string | null
          evaluacion_id?: number | null
          id?: never
          inicio?: string
          modelo: string
          resultado: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
        }
        Update: {
          detalle?: string | null
          evaluacion_id?: number | null
          id?: never
          inicio?: string
          modelo?: string
          resultado?: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "llamada_ia_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluacion_ia"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacion_enviada: {
        Row: {
          enviada_en: string
          id: number
          partido_id: number
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          usuario_id: string
        }
        Insert: {
          enviada_en?: string
          id?: never
          partido_id: number
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          usuario_id: string
        }
        Update: {
          enviada_en?: string
          id?: never
          partido_id?: number
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacion_enviada_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacion_enviada_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacion_enviada_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario_publico"
            referencedColumns: ["id"]
          },
        ]
      }
      partido: {
        Row: {
          calificado_en: string | null
          cierre_predicciones: string
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
          listo_para_calificar_en: string | null
          partido_origen_id: number | null
          proveedor_id: number | null
          sincronizado_en: string
          torneo_id: number
        }
        Insert: {
          calificado_en?: string | null
          cierre_predicciones: string
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
          listo_para_calificar_en?: string | null
          partido_origen_id?: number | null
          proveedor_id?: number | null
          sincronizado_en: string
          torneo_id: number
        }
        Update: {
          calificado_en?: string | null
          cierre_predicciones?: string
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
          listo_para_calificar_en?: string | null
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
      prediccion: {
        Row: {
          actualizada_en: string
          creada_en: string
          id: number
          justificacion: string | null
          marcador_local: number | null
          marcador_visitante: number | null
          partido_id: number
          rango_goles: Database["public"]["Enums"]["rango_goles"] | null
          resultado: Database["public"]["Enums"]["resultado_prediccion"] | null
          usuario_id: string
        }
        Insert: {
          actualizada_en?: string
          creada_en?: string
          id?: never
          justificacion?: string | null
          marcador_local?: number | null
          marcador_visitante?: number | null
          partido_id: number
          rango_goles?: Database["public"]["Enums"]["rango_goles"] | null
          resultado?: Database["public"]["Enums"]["resultado_prediccion"] | null
          usuario_id?: string
        }
        Update: {
          actualizada_en?: string
          creada_en?: string
          id?: never
          justificacion?: string | null
          marcador_local?: number | null
          marcador_visitante?: number | null
          partido_id?: number
          rango_goles?: Database["public"]["Enums"]["rango_goles"] | null
          resultado?: Database["public"]["Enums"]["resultado_prediccion"] | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediccion_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediccion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prediccion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario_publico"
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
      usuario: {
        Row: {
          correo: string
          creado_en: string
          equipo_favorito_id: number | null
          foto_url: string | null
          google_id: string
          id: string
          nombre: string
          recordatorios_activos: boolean
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          correo: string
          creado_en?: string
          equipo_favorito_id?: number | null
          foto_url?: string | null
          google_id: string
          id: string
          nombre: string
          recordatorios_activos?: boolean
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          correo?: string
          creado_en?: string
          equipo_favorito_id?: number | null
          foto_url?: string | null
          google_id?: string
          id?: string
          nombre?: string
          recordatorios_activos?: boolean
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: [
          {
            foreignKeyName: "usuario_equipo_favorito_id_fkey"
            columns: ["equipo_favorito_id"]
            isOneToOne: false
            referencedRelation: "equipo"
            referencedColumns: ["id"]
          },
        ]
      }
      valor_puntos: {
        Row: {
          id: boolean
          marcador_exacto: number
          rango_goles: number
          resultado: number
        }
        Insert: {
          id?: boolean
          marcador_exacto: number
          rango_goles: number
          resultado: number
        }
        Update: {
          id?: boolean
          marcador_exacto?: number
          rango_goles?: number
          resultado?: number
        }
        Relationships: []
      }
    }
    Views: {
      mis_puntos: {
        Row: {
          afirmaciones: Json | null
          estado_bono: string | null
          estado_prediccion: string | null
          explicacion: string | null
          partido_id: number | null
          prediccion_id: number | null
          puntos_base: number | null
          puntos_bono: number | null
          puntos_marcador: number | null
          puntos_rango_goles: number | null
          puntos_resultado: number | null
          puntos_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prediccion_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partido"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_publico: {
        Row: {
          equipo_favorito_id: number | null
          foto_url: string | null
          id: string | null
          nombre: string | null
        }
        Insert: {
          equipo_favorito_id?: number | null
          foto_url?: string | null
          id?: string | null
          nombre?: string | null
        }
        Update: {
          equipo_favorito_id?: number | null
          foto_url?: string | null
          id?: string | null
          nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_equipo_favorito_id_fkey"
            columns: ["equipo_favorito_id"]
            isOneToOne: false
            referencedRelation: "equipo"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      actualizar_estados_partidos: { Args: { datos: Json }; Returns: number }
      avisos_puntos_pendientes: {
        Args: { ahora: string }
        Returns: {
          es_simulado: boolean
          estado_bono: string
          goles_local: number
          goles_visitante: number
          local: string
          partido_id: number
          puntos_base: number
          puntos_bono: number
          tokens: string[]
          usuario_id: string
          visitante: string
        }[]
      }
      guardar_carga_inicial: { Args: { carga: Json }; Returns: Json }
      guardar_datos_partido: { Args: { datos: Json }; Returns: Json }
      guardar_evaluacion: {
        Args: { datos: Json; id_evaluacion: number }
        Returns: boolean
      }
      hay_evaluaciones_por_hacer: {
        Args: { ahora: string; tope: number }
        Returns: boolean
      }
      jornada_actual: { Args: { ahora?: string }; Returns: number }
      liberar_evaluaciones: { Args: { ids: number[] }; Returns: undefined }
      llamadas_ia_hoy: { Args: { ahora: string }; Returns: number }
      partidos_pendientes_de_final: {
        Args: { ahora: string }
        Returns: {
          estado: Database["public"]["Enums"]["estado_partido"]
          proveedor_id: number
        }[]
      }
      partidos_por_calificar: {
        Args: { limite: number }
        Returns: {
          goles_local: number
          goles_visitante: number
          partido_id: number
        }[]
      }
      recordatorios_pendientes: {
        Args: { ahora: string }
        Returns: {
          cierre_predicciones: string
          jornada_orden: number
          local: string
          partido_id: number
          tokens: string[]
          usuario_id: string
          visitante: string
        }[]
      }
      registrar_calificaciones: {
        Args: { calificaciones: Json; id_partido: number }
        Returns: string
      }
      registrar_dispositivo: { Args: { token: string }; Returns: undefined }
      registrar_fallo_evaluacion: {
        Args: { id_evaluacion: number; motivo: string }
        Returns: Database["public"]["Enums"]["estado_evaluacion"]
      }
      simulacion_crear: {
        Args: { minutos?: number; origen: number }
        Returns: number
      }
      simulacion_iniciar: { Args: { partido: number }; Returns: undefined }
      simulacion_terminar: { Args: { partido: number }; Returns: undefined }
      tomar_evaluaciones: {
        Args: { limite: number }
        Returns: {
          evaluacion_id: number
          intentos: number
          partido_id: number
          prediccion_id: number
        }[]
      }
    }
    Enums: {
      estado_evaluacion: "PENDIENTE" | "EVALUADA" | "ERROR"
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
      rango_goles: "G0_1" | "G2" | "G3" | "G4_MAS"
      resultado_prediccion: "LOCAL" | "EMPATE" | "VISITANTE"
      rol_usuario: "USUARIO" | "ADMIN"
      tipo_evento: "GOL" | "TARJETA" | "CAMBIO" | "VAR"
      tipo_notificacion: "RECORDATORIO" | "PUNTOS_LISTOS"
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
      estado_evaluacion: ["PENDIENTE", "EVALUADA", "ERROR"],
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
      rango_goles: ["G0_1", "G2", "G3", "G4_MAS"],
      resultado_prediccion: ["LOCAL", "EMPATE", "VISITANTE"],
      rol_usuario: ["USUARIO", "ADMIN"],
      tipo_evento: ["GOL", "TARJETA", "CAMBIO", "VAR"],
      tipo_notificacion: ["RECORDATORIO", "PUNTOS_LISTOS"],
      tipo_sincronizacion: [
        "CARGA_INICIAL",
        "ACTUALIZACION_DIARIA",
        "DETECCION_FINALES",
        "DATOS_PARTIDO",
      ],
    },
  },
} as const
