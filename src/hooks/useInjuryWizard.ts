import { useState, useCallback } from 'react';
import { createInjuryAction } from '@/app/actions/injury-actions';
import toast from 'react-hot-toast';

export interface InjuryFormState {
  zonaAnatomica: string;
  regionGeneral: string;
  muscleGroup: string;
  zonaCode: string;
  tipoLesion: string;
  gravedad: 'Leve' | 'Moderado' | 'Grave';
  descripcionMedica: string;
  tiempoRecuperacionEstimado: string;
  fechaInicio: string;
  fechaAltaEstimada: string;
  estado: 'Tratamiento' | 'De Baja';
  tratamiento: string;
  fisioterapia: string;
  observaciones: string;
}

export function useInjuryWizard(playerId: string, onSaved?: () => void) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState<InjuryFormState>({
    zonaAnatomica: 'Isquiotibiales Derecho',
    regionGeneral: 'Miembros inferiores',
    muscleGroup: 'Isquiotibiales',
    zonaCode: 'isquiotibiales_der',
    tipoLesion: 'Rotura muscular',
    gravedad: 'Moderado',
    descripcionMedica: 'Desgarro de fibras musculares en la porción larga del bíceps femoral derecho.',
    tiempoRecuperacionEstimado: '8 - 12 semanas',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaAltaEstimada: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 70); // ~10 semanas
      return d.toISOString().split('T')[0];
    })(),
    estado: 'De Baja',
    tratamiento: 'Crioterapia inicial, compresión, reposo activo y descarga relativa.',
    fisioterapia: 'Readaptación progresiva, trabajo isométrico y terapia manual.',
    observaciones: 'Seguimiento ecográfico de control a los 14 días.',
  });

  const updateForm = useCallback((fields: Partial<InjuryFormState>) => {
    setForm((prev) => ({ ...prev, ...fields }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  }, []);

  const saveInjury = useCallback(async () => {
    if (!playerId) {
      toast.error('No se ha especificado el ID del jugador');
      return false;
    }

    setSaving(true);
    try {
      const lateralityMap: Record<string, 'izquierdo' | 'derecho' | 'bilateral' | 'no_aplica'> = {
        Derecho: 'derecho',
        Izquierdo: 'izquierdo',
        Bilateral: 'bilateral',
        'No aplica': 'no_aplica',
      };

      const lat: 'derecha' | 'izquierda' | 'no_aplica' = form.zonaAnatomica.toLowerCase().includes('derech')
        ? 'derecha'
        : form.zonaAnatomica.toLowerCase().includes('izquierd')
        ? 'izquierda'
        : 'no_aplica';

      const res = await createInjuryAction({
        playerId,
        injuryDate: form.fechaInicio,
        injuryType: form.tipoLesion,
        expectedReturnDate: form.fechaAltaEstimada || undefined,
        severity: form.gravedad === 'Leve' ? 'Leve' : form.gravedad === 'Moderado' ? 'Moderada' : 'Grave',
        bodyRegion: form.regionGeneral,
        bodyStructure: form.zonaAnatomica,
        laterality: lat,
        notes: `${form.descripcionMedica}\n\n[Tratamiento]: ${form.tratamiento}\n[Fisioterapia]: ${form.fisioterapia}\n[Observaciones]: ${form.observaciones}`,
      });

      if (res.success) {
        toast.success('¡Lesión registrada correctamente en el historial médico!');
        onSaved?.();
        return true;
      } else {
        toast.error(res.error || 'Error al guardar la lesión');
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado al registrar la lesión');
      return false;
    } finally {
      setSaving(false);
    }
  }, [playerId, form, onSaved]);

  return {
    currentStep,
    form,
    saving,
    updateForm,
    nextStep,
    prevStep,
    goToStep,
    saveInjury,
  };
}
