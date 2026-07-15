"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, CheckCircle, XCircle, Clock, FileText, AlertTriangle, Banknote, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSignedDniUrlAction } from "@/app/actions/secretaria-actions";
import { getInscriptionsAction, approveInscriptionAction, requestCorrectionAction, rejectInscriptionAction } from "@/app/actions/inscriptions-actions";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

// Tipos para el estado simulado
type InscriptionStatus = 'pending_revision' | 'request_correction' | 'pending_payment' | 'formalized' | 'rejected';

interface PlayerInscription {
  id: string;
  name: string;
  category: string;
  date: string;
  status: InscriptionStatus;
  paymentMethod: string;
  feeTotal: number;
}

export function InscriptionsAdminPanel() {
  const [inscriptions, setInscriptions] = useState<PlayerInscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InscriptionStatus | 'all'>('all');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchInscriptions = async () => {
    setLoading(true);
    try {
      const res = await getInscriptionsAction();
      if (res.success && res.data) {
        setInscriptions(res.data as PlayerInscription[]);
      } else {
        toast.error("Error al cargar las inscripciones (Revisa la consola)");
        console.error("fetchInscriptions failed:", res);
      }
    } catch (e) {
      toast.error("Error de conexión al cargar inscripciones");
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInscriptions();
  }, []);

  const filteredInscriptions = inscriptions.filter(
    (item) => filter === 'all' || item.status === filter
  );

  const handleApprove = async (id: string) => {
    const res = await approveInscriptionAction(id);
    if (res.success) {
      toast.success("Inscripción aprobada correctamente");
      fetchInscriptions();
    } else {
      toast.error("Error al aprobar");
    }
  };

  const handleValidatePayment = (id: string) => {
    // Para simplificar, usamos approveInscriptionAction que ahora lo marca como SUCCESS_MOCK
    handleApprove(id);
  };

  const openRejection = (id: string) => {
    setSelectedPlayer(id);
    setRejectionModalOpen(true);
  };

  const submitRejection = async () => {
    if (!selectedPlayer || !rejectionReason) return;
    
    const res = await requestCorrectionAction(selectedPlayer, rejectionReason);
    if (res.success) {
      toast.success("Aviso de subsanación enviado");
      fetchInscriptions();
    } else {
      toast.error("Error al enviar el aviso");
    }
    
    setRejectionModalOpen(false);
    setRejectionReason("");
    setSelectedPlayer(null);
  };

  const handleViewDni = async (playerId: string) => {
    // Simulamos la ruta del archivo DNI por jugador. En la BD real estaría en player_documents.
    const mockFilePath = `${playerId}/dni-frente.jpg`;
    
    try {
      const res = await getSignedDniUrlAction(mockFilePath);
      if (res.success && res.signedUrl) {
        window.open(res.signedUrl, '_blank');
      } else {
        alert("Error al cargar DNI: " + res.error);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const getStatusBadge = (status: InscriptionStatus) => {
    switch (status) {
      case 'pending_revision':
        return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Revisión Pdte.</span>;
      case 'request_correction':
        return <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Subsanación</span>;
      case 'pending_payment':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full flex items-center gap-1"><FileText className="w-3 h-3" /> Pago Pdte.</span>;
      case 'formalized':
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Formalizado</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secretaría: Inscripciones</h1>
          <p className="text-gray-500">Gestión y validación de nuevas altas y renovaciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} className="text-xs h-8">Todas</Button>
          <Button variant={filter === 'pending_revision' ? 'default' : 'outline'} onClick={() => setFilter('pending_revision')} className="text-xs h-8 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-0">Revisiones</Button>
          <Button variant={filter === 'pending_payment' ? 'default' : 'outline'} onClick={() => setFilter('pending_payment')} className="text-xs h-8 bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">Pagos</Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <div className="p-4 border-b flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar por nombre, DNI o categoría..." className="pl-9" />
          </div>
          <Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filtros</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Jugador</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Pago</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-2" />
                    Cargando inscripciones...
                  </td>
                </tr>
              ) : filteredInscriptions.length > 0 ? (
                filteredInscriptions.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-gray-500">{item.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold">{item.feeTotal}€</span>
                        <span className="text-xs text-gray-500">{item.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      
                      {item.status === 'pending_revision' && (
                        <>
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleViewDni(item.id)}>
                            <FileText className="w-4 h-4 mr-1" /> Ver DNI
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openRejection(item.id)}>
                            <XCircle className="w-4 h-4 mr-1" /> Rechazar Doc.
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(item.id)}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                          </Button>
                        </>
                      )}

                      {item.status === 'pending_payment' && (item.paymentMethod === 'Transferencia' || item.paymentMethod === 'Contado') && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleValidatePayment(item.id)}>
                          <Banknote className="w-4 h-4 mr-1" /> Validar Pago Manual
                        </Button>
                      )}

                      {item.status === 'formalized' && (
                        <Button size="sm" variant="outline" disabled>Completado</Button>
                      )}

                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No hay inscripciones en este estado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Rejection */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Rechazar Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Se enviará un correo electrónico automáticamente a la familia indicando que deben volver a subir la documentación incorrecta.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Motivo del rechazo <span className="text-red-500">*</span></label>
                <textarea 
                  className="w-full p-3 border rounded-md min-h-[100px] text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="Ej. El DNI está caducado o la foto se ve borrosa..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </CardContent>
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setRejectionModalOpen(false)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!rejectionReason} onClick={submitRejection}>
                Enviar Aviso de Subsanación
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
