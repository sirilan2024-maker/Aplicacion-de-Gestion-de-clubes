"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function GenericJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/join/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-center">
        <div className="mx-auto bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Unirse a un equipo</h1>
        <p className="text-gray-500 mb-8">Por código secreto</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              required
              placeholder="Introduce tu código (ej. 171X8PJFZY)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full uppercase text-center text-xl tracking-widest font-mono rounded-lg border border-gray-300 px-4 py-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Validar
          </button>
        </form>
      </div>
    </div>
  );
}
