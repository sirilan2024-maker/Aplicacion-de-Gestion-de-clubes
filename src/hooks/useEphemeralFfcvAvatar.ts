"use client";

import { useState, useEffect } from "react";

/**
 * Hook para cargar de forma efímera en memoria la foto oficial de la FFCV
 * solo cuando el jugador NO tiene foto propia subida en la base de datos (avatar_url).
 * No almacena nada en el servidor ni consume cuota de almacenamiento.
 * Utiliza sessionStorage para respuestas instantáneas (0 ms) en visitas recurrentes de la sesión.
 */
export function useEphemeralFfcvAvatar(playerId?: string | null, hasOwnAvatar?: boolean): string | null {
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay id o el jugador ya tiene foto propia, no consultar la FFCV
    if (!playerId || hasOwnAvatar) {
      setAvatar(null);
      return;
    }

    const cacheKey = `ffcv_avatar_${playerId}`;
    try {
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          if (cached !== "none") {
            setAvatar(cached);
          }
          return;
        }
      }
    } catch {
      // Ignorar errores de acceso a sessionStorage
    }

    let isMounted = true;

    fetch(`/api/ffcv-player-info?playerId=${playerId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data?.found && data?.player?.foto_base64) {
          const photo = data.player.foto_base64;
          setAvatar(photo);
          try {
            sessionStorage.setItem(cacheKey, photo);
          } catch {
            // Silencioso si el storage está lleno
          }
        } else {
          try {
            sessionStorage.setItem(cacheKey, "none");
          } catch {}
        }
      })
      .catch(() => {
        // En caso de fallo de red, se mantiene el placeholder predeterminado
      });

    return () => {
      isMounted = false;
    };
  }, [playerId, hasOwnAvatar]);

  return avatar;
}
