"use client";

import React, { useState, useEffect } from "react";
import { getClubUsersForImpersonationAction, startImpersonationAction } from "@/app/actions/impersonation-actions";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye, Users, Shield, Loader2, X, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

interface UserItem {
  id: string;
  name: string;
  roleKey: string;
  roleLabel: string;
  avatarUrl?: string | null;
}

interface ImpersonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImpersonationModal({ open, onOpenChange }: ImpersonationModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getClubUsersForImpersonationAction();
      if (res.data && res.data.length > 0) {
        setUsers(res.data);
      } else if (!res.success) {
        toast.error("No tienes permisos para ver usuarios o hubo un error.");
      }
    } catch (e) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleStartImpersonation = async (userId: string, userName: string) => {
    setStartingId(userId);
    try {
      const res = await startImpersonationAction(userId);
      if (res.success && res.redirectUrl) {
        toast.success(`Iniciando vista como ${userName}...`);
        onOpenChange(false);
        window.location.href = res.redirectUrl;
      } else {
        toast.error(res.error || "No se pudo iniciar la suplantación");
      }
    } catch (e) {
      toast.error("Error al iniciar la vista de usuario");
    } finally {
      setStartingId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                          user.roleLabel.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" ||
                        (roleFilter === "staff" && ["coach", "entrenador", "delegado", "coordinador"].includes(user.roleKey)) ||
                        (roleFilter === "family" && ["familia", "family", "tutor", "jugador"].includes(user.roleKey)) ||
                        (roleFilter === "admin" && ["admin", "superadmin", "secretario", "tesorero", "directivo"].includes(user.roleKey)) ||
                        (roleFilter === "utillero" && user.roleKey === "utillero");
    return matchesSearch && matchesRole;
  });

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Ver aplicación como cualquier Usuario / Rol"
      description="Selecciona cualquier usuario del club para navegar por la plataforma exactamente como él."
      className="max-w-xl max-h-[85vh] flex flex-col p-6"
    >
      <div className="space-y-4">

        {/* Search and Filters */}
        <div className="space-y-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar usuario por nombre o rol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 text-sm rounded-xl"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1 rounded-full font-medium transition-all ${roleFilter === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Todos ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter("family")}
              className={`px-3 py-1 rounded-full font-medium transition-all ${roleFilter === "family" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Familias / Jugadores
            </button>
            <button
              onClick={() => setRoleFilter("staff")}
              className={`px-3 py-1 rounded-full font-medium transition-all ${roleFilter === "staff" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Cuerpo Técnico / Entrenadores
            </button>
            <button
              onClick={() => setRoleFilter("utillero")}
              className={`px-3 py-1 rounded-full font-medium transition-all ${roleFilter === "utillero" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Utillería
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1 rounded-full font-medium transition-all ${roleFilter === "admin" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Gestión / Administración
            </button>
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 max-h-[350px] no-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-xs font-medium">Cargando usuarios del club...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No se encontraron usuarios con ese nombre o filtro.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-blue-50/60 hover:border-blue-200 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{user.name}</h4>
                    <span className="text-xs font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {user.roleLabel}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleStartImpersonation(user.id, user.name)}
                  disabled={startingId === user.id}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {startingId === user.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Ver como este usuario
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
