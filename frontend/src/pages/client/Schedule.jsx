import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, CheckCircle2, AlertCircle, Sparkles, Video, ExternalLink } from 'lucide-react';
import api from '../../lib/axios';

const AVAILABLE_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', 
  '01:30 PM', '02:00 PM', '03:30 PM', '04:00 PM'
];

const STATUS_LABELS = {
  scheduled: 'Agendada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_COLORS = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  no_show: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function Schedule() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [topic, setTopic] = useState('');
  const [step, setStep] = useState(1); // 1: Form, 2: Loading, 3: Success

  // Today formatted as YYYY-MM-DD for min date limit
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: appointments = [], isLoading: isLoadingAppts } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/appointments/me').then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/meetings/schedule', data),
    onSuccess: () => {
      qc.invalidateQueries(['my-appointments']);
      setStep(3);
    },
    onError: (err) => {
      alert('Error scheduling meeting: ' + (err.response?.data?.detail || err.message));
      setStep(1);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) {
      alert('Por favor selecciona fecha y hora.');
      return;
    }
    setStep(2);
    mutation.mutate({
      meeting_date: selectedDate,
      time_slot: selectedSlot,
      topic: topic || 'Consultoría de proyecto'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 pb-16">
      <div className="text-center px-4 mt-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Calendar className="w-6 h-6 text-brand-600" /> Agenda una Reunión
        </h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          Selecciona el día y hora que mejor te convenga. Sincronizado automáticamente con Google Calendar vía n8n.
        </p>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 max-w-xl mx-auto w-full border border-gray-50">
        {step === 1 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Topic Field */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Asunto / Tema de la llamada</label>
              <input
                type="text"
                required
                placeholder="Ej. Revisar el diseño de la landing page"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            {/* Date Picker */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Seleccionar Fecha</label>
              <input
                type="date"
                required
                min={todayStr}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Time Slot Picker */}
            {selectedDate && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-3">Horas Disponibles</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {AVAILABLE_SLOTS.map((time) => {
                    const isSelected = selectedSlot === time;
                    return (
                      <button
                        type="button"
                        key={time}
                        onClick={() => setSelectedSlot(time)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected 
                            ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                            : 'border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-brand-50 rounded-2xl p-4 flex gap-3">
              <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-brand-900 mb-1">Automatización Activa</h5>
                <p className="text-[10px] text-brand-700/80 leading-relaxed">
                  Al confirmar, n8n verificará tu cita, agendará en Google Calendar y te enviará un correo con el link de Google Meet.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-all shadow-md shadow-brand-500/20"
            >
              Confirmar Cita
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mb-4" />
            <p className="text-sm font-semibold text-gray-700">Verificando disponibilidad en Google Calendar...</p>
            <p className="text-xs text-gray-400 mt-1">Gatillando workflow de n8n...</p>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">¡Cita Agendada Exitosamente!</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed mb-6">
              Hemos reservado el día <span className="font-bold text-gray-800">{selectedDate}</span> a las <span className="font-bold text-gray-800">{selectedSlot}</span>.
            </p>

            <div className="w-full bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 flex items-center gap-3 justify-center text-left">
              <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600 shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-800">Reunión de Google Meet</div>
                <a 
                  href="https://meet.google.com/mock-meet-link" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] text-brand-600 font-bold hover:underline"
                >
                  meet.google.com/mock-meet-link
                </a>
              </div>
            </div>

            <button
              onClick={() => { setStep(1); setSelectedSlot(''); setSelectedDate(''); setTopic(''); }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-colors"
            >
              Volver al formulario
            </button>
          </div>
        )}
      </div>

      {/* List of existing appointments */}
      <div className="max-w-xl mx-auto w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-600" /> Mis Citas Programadas
        </h3>
        
        {isLoadingAppts ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-400 text-sm">
            Cargando tus citas...
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-400 text-sm">
            No tienes citas agendadas aún.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl shrink-0 mt-0.5">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{appt.title}</h4>
                    {appt.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{appt.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">{formatDate(appt.appointment_date)}</span>
                      <span>•</span>
                      <span className="font-medium text-gray-700">{appt.time_slot} ({appt.duration_minutes} min)</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[appt.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {STATUS_LABELS[appt.status] || appt.status}
                  </span>
                  {appt.meeting_link && (
                    <a 
                      href={appt.meeting_link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Unirse a la llamada"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
