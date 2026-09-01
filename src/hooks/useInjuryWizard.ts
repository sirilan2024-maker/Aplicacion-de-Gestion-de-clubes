import { useState, useCallback } from 'react';
import { createInjuryAction } from '@/app/actions/injury-actions';
import toast from 'react-hot-toast';

export interface InjuryFormState {
  zonaAnatomica: string;
  regionGeneral: string;
  muscleGroup: string;
  zonaCode: string;
  incidencia: string;
  mecanismoComun: string;
  munichClassification: 'Funcional' | 'Estructural';
  munichGrade: '1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '4';
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

  // Estado inicial completamente limpio (sin lesión ni músculo pre-seleccionado)
  const [form, setForm] = useState<InjuryFormState>({
    zonaAnatomica: '',
    regionGeneral: '',
    muscleGroup: '',
    zonaCode: '',
    incidencia: '',
    mecanismoComun: '',
    munichClassification: 'Estructural',
    munichGrade: '3A',
    tipoLesion: 'Tipo 3A — Rotura fibrilar menor / Miofascial (<5mm)',
    gravedad: 'Moderado',
    descripcionMedica: '',
    tiempoRecuperacionEstimado: '2 — 3 semanas',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaAltaEstimada: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 21);
      return d.toISOString().split('T')[0];
    })(),
    estado: 'De Baja',
    tratamiento: 'Crioterapia inicial, compresión elástica y descarga relativa.',
    fisioterapia: 'Protocolo PEACE & LOVE, movilización precoz indolora y activación isométrica.',
    observaciones: '',
  });

  const updateForm = useCallback((fields: Partial<InjuryFormState>) => {
    setForm((prev) => ({ ...prev, ...fields }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep === 1 && !form.zonaAnatomica) {
      toast.error('Por favor, selecciona primero un músculo o zona en el avatar.');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, [currentStep, form.zonaAnatomica]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step > 1 && !form.zonaAnatomica) {
      toast.error('Por favor, selecciona primero un músculo o zona en el avatar.');
      return;
    }
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  }, [form.zonaAnatomica]);

  const saveInjury = useCallback(async () => {
    if (!playerId) {
      toast.error('No se ha especificado el ID del jugador');
      return false;
    }
    if (!form.zonaAnatomica) {
      toast.error('Selecciona la zona muscular afectada');
      return false;
    }

    setSaving(true);
    try {
      const lat: 'derecha' | 'izquierda' | 'no_aplica' = form.zonaAnatomica.toLowerCase().includes('derech')
        ? 'derecha'
        : form.zonaAnatomica.toLowerCase().includes('izquierd')
        ? 'izquierda'
        : 'no_aplica';

      const fullNotes = [
        `[Consenso Múnich]: ${form.munichClassification} - Grado ${form.munichGrade} (${form.tipoLesion})`,
        form.mecanismoComun ? `[Mecanismo Lesional en Fútbol]: ${form.mecanismoComun}` : '',
        form.descripcionMedica ? `[Diagnóstico Clínico]: ${form.descripcionMedica}` : '',
        form.tratamiento ? `[Tratamiento Prescrito]: ${form.tratamiento}` : '',
        form.fisioterapia ? `[Plan Fisioterapia]: ${form.fisioterapia}` : '',
        form.observaciones ? `[Observaciones]: ${form.observaciones}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await createInjuryAction({
        playerId,
        injuryDate: form.fechaInicio,
        injuryType: `${form.tipoLesion} (${form.zonaAnatomica})`,
        expectedReturnDate: form.fechaAltaEstimada || undefined,
        severity: form.gravedad === 'Leve' ? 'Leve' : form.gravedad === 'Moderado' ? 'Moderada' : 'Grave',
        bodyRegion: form.regionGeneral || 'Miembros inferiores',
        bodyStructure: form.zonaAnatomica,
        laterality: lat,
        notes: fullNotes,
      });

      if (res.success) {
        toast.success('¡Lesión registrada con éxito bajo el Consenso de Múnich!');
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
