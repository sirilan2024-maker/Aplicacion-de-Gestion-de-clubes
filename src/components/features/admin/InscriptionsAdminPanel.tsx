"use client";

import React, { useState } from "react";
import { Search, Filter, CheckCircle, XCircle, Clock, FileText, AlertTriangle, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalModal } from "@/components/ui/LegalModal";

// Tipos para el estado simulado
type InscriptionStatus = 'pending_revision' | 'request_correction' | 'pending_payment' | 'formalized';

interface PlayerInscription {
  id: string;
  name: string;
  category: string;
  date: string;
  status: InscriptionStatus;
  paymentMethod: string;
  feeTotal: number;
}

const mockData: PlayerInscription[] = [
  { id: "1", name: "Juan Pérez", category: "Infantil", date: "12/07/2026", status: "pending_revision", paymentMethod: "Stripe", feeTotal: 250 },
  { id: "2", name: "Carlos López", category: "Senior", date: "11/07/2026", status: "pending_payment", paymentMethod: "Transferencia", feeTotal: 195 },
  { id: "3", name: "Mario García", category: "Cadete", date: "10/07/2026", status: "request_correction", paymentMethod: "Contado", feeTotal: 145 },
];

export function InscriptionsAdminPanel() {
  const [inscriptions, setInscriptions] = useState<PlayerInscription[]>(mockData);
  const [filter, setFilter] = useState<InscriptionStatus | 'all'>('all');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredInscriptions = inscriptions.filter(
    (item) => filter === 'all' || item.status === filter
  );

  const handleApprove = (id: string) => {
    // Si se aprueba la revisión, pasa a pendiente de pago
    setInscriptions(prev => prev.map(p => p.id === id ? { ...p, status: 'pending_payment' } : p));
  };

  const handleValidatePayment = (id: string) => {
    // Valida el pago manual (transferencia/contado) y formaliza la inscripción
    setInscriptions(prev => prev.map(p => p.id === id ? { ...p, status: 'formalized' } : p));
    alert("Pago validado. El jugador ha sido formalizado y se ha habilitado su pedido de utillería.");
  };

  const openRejection = (id: string) => {
    setSelectedPlayer(id);
    setRejectionModalOpen(true);
  };

  const submitRejection = () => {
    if (!selectedPlayer || !rejectionReason) return;
    
    // Simula la llamada a la base de datos que dispara el Edge Function
    console.log(`Rechazando documento para jugador ${selectedPlayer}. Motivo: ${rejectionReason}`);
    alert("Se ha enviado un correo automático a la familia con el enlace de subsanación.");
    
    setInscriptions(prev => prev.map(p => p.id === selectedPlayer ? { ...p, status: 'request_correction' } : p));
    setRejectionModalOpen(false);
    setRejectionReason("");
    setSelectedPlayer(null);
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
              {filteredInscriptions.map(item => (
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
              ))}
              {filteredInscriptions.length === 0 && (
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
