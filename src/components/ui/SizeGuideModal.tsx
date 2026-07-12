"use client"

import React, { useState } from "react"
import { X } from "lucide-react"

interface SizeGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'junior' | 'unisex' | 'mujer'>('junior')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-slate-800">
        {/* Header Modal */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">📏</span>
            <h3 className="font-bold text-lg text-slate-800">Guía de Tallas Oficial (Hummel)</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selector de Pestañas del Modal */}
        <div className="flex border-b border-slate-100 bg-slate-50/20">
          <button
            type="button"
            onClick={() => setActiveTab('junior')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'junior' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            👦 Junior (Niños)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unisex')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'unisex' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            👕 Hombre / Unisex
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mujer')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'mujer' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            👚 Mujer
          </button>
        </div>

        {/* Contenido Modal */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'junior' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">El tallaje infantil se basa directamente en la estatura total en centímetros del niño.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Talla 116</span>
                  <span className="text-slate-500 text-xs">5-6 años (Altura ~116 cm)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Talla 128</span>
                  <span className="text-slate-500 text-xs">7-8 años (Altura ~128 cm)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Talla 140</span>
                  <span className="text-slate-500 text-xs">9-10 años (Altura ~140 cm)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Talla 152</span>
                  <span className="text-slate-500 text-xs">11-12 años (Altura ~152 cm)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Talla 164</span>
                  <span className="text-slate-500 text-xs">13-14 años (Altura ~164 cm)</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Talla 176</span>
                  <span className="text-slate-500 text-xs">15-16 años (Altura ~176 cm)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'unisex' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Corresponde a la estructura estándar para camisetas, sudaderas, chaquetas y pantalones de corte masculino o recto.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Talla EU</th>
                      <th className="py-2.5 px-3">Pecho (cm)</th>
                      <th className="py-2.5 px-3">Cintura (cm)</th>
                      <th className="py-2.5 px-3">Cadera (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 px-3 font-bold">S</td>
                      <td className="py-2.5 px-3">94 cm</td>
                      <td className="py-2.5 px-3">82 cm</td>
                      <td className="py-2.5 px-3">97 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">M</td>
                      <td className="py-2.5 px-3">99 cm</td>
                      <td className="py-2.5 px-3">87 cm</td>
                      <td className="py-2.5 px-3">102 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">L</td>
                      <td className="py-2.5 px-3">104 cm</td>
                      <td className="py-2.5 px-3">92 cm</td>
                      <td className="py-2.5 px-3">107 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">XL</td>
                      <td className="py-2.5 px-3">110 cm</td>
                      <td className="py-2.5 px-3">98 cm</td>
                      <td className="py-2.5 px-3">113 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">2XL / XXL</td>
                      <td className="py-2.5 px-3">116 cm</td>
                      <td className="py-2.5 px-3">104 cm</td>
                      <td className="py-2.5 px-3">119 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">3XL</td>
                      <td className="py-2.5 px-3">~122 cm</td>
                      <td className="py-2.5 px-3">~110 cm</td>
                      <td className="py-2.5 px-3">~125 cm</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'mujer' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Diseñado con un patrón entallado específico para jugadoras de corte femenino.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Talla EU</th>
                      <th className="py-2.5 px-3">Pecho (cm)</th>
                      <th className="py-2.5 px-3">Cintura (cm)</th>
                      <th className="py-2.5 px-3">Cadera (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 px-3 font-bold">XS</td>
                      <td className="py-2.5 px-3">84 cm</td>
                      <td className="py-2.5 px-3">64 cm</td>
                      <td className="py-2.5 px-3">88 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">S</td>
                      <td className="py-2.5 px-3">88 cm</td>
                      <td className="py-2.5 px-3">68 cm</td>
                      <td className="py-2.5 px-3">92 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">M</td>
                      <td className="py-2.5 px-3">92 cm</td>
                      <td className="py-2.5 px-3">72 cm</td>
                      <td className="py-2.5 px-3">96 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">L</td>
                      <td className="py-2.5 px-3">96 cm</td>
                      <td className="py-2.5 px-3">76 cm</td>
                      <td className="py-2.5 px-3">100 cm</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold">XL</td>
                      <td className="py-2.5 px-3">101 cm</td>
                      <td className="py-2.5 px-3">80 cm</td>
                      <td className="py-2.5 px-3">104 cm</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Talla Medias footer */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="font-bold text-sm text-slate-800 block mb-1">🧦 Tallas de Calzado para Medias</span>
            <p className="text-xs text-slate-600">
              Las medias oficiales utilizan las siguientes correspondencias de número de pie:
              <span className="font-bold text-blue-600 ml-1">28-32, 33-35, 36-38, 39-42 y 43-46</span>.
            </p>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm transition-colors"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  )
}
