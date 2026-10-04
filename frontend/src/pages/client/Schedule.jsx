import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Video, CalendarPlus } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';
import { apiError, longDate } from '../../lib/format';
import { APPOINTMENT_STATUS } from '../../lib/stages';
import { Badge, Button, Card, CardTitle, EmptyState, ErrorText, Field, Spinner, inputClass } from '../../components/ui';

const AVAILABLE_SLOTS = ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:00 PM', '03:30 PM', '04:00 PM'];

function AppointmentRow({ appt }) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex flex-col items-center justify-center shrink-0 leading-none">
        <span className="text-base font-extrabold">{appt.appointment_date.slice(8, 10)}</span>
        <span className="text-[9px] font-bold uppercase mt-0.5">{new Date(`${appt.appointment_date}T00:00:00`).toLocaleDateString('es-VE', { month: 'short' }).replace('.', '')}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900 truncate">{appt.title}</div>
        <div className="text-xs text-gray-500 capitalize">{longDate(appt.appointment_date)} · {appt.time_slot} · {appt.duration_minutes} min</div>
      </div>
      {appt.meeting_link && appt.status === 'scheduled' ? (
        <a href={appt.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl px-3 py-2 shrink-0">
          <Video className="w-3.5 h-3.5" /> Unirse
        </a>
      ) : (
        <Badge tone={APPOINTMENT_STATUS[appt.status]?.tone} dot>{APPOINTMENT_STATUS[appt.status]?.label || appt.status}</Badge>
      )}
    </div>
  );
}

export default function Schedule() {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [topic, setTopic] = useState('');

  const todayStr = new Date().toLocaleDateString('en-CA');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/appointments/me').then((r) => r.data),
  });

  const { data: taken = [] } = useQuery({
    queryKey: ['taken-slots', selectedDate],
    queryFn: () => api.get('/meetings/taken-slots', { params: { meeting_date: selectedDate } }).then((r) => r.data.taken),
    enabled: !!selectedDate,
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/meetings/schedule', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['taken-slots'] });
    },
  });

  const reset = () => { mutation.reset(); setSelectedSlot(''); setSelectedDate(''); setTopic(''); };
  const booked = mutation.data;

  const upcoming = appointments.filter((a) => a.status === 'scheduled' && a.appointment_date >= todayStr).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  const past = appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <Card className="p-6 lg:col-span-3 self-start">
        {booked ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-7 h-7 text-emerald-600" /></div>
            <h3 className="font-extrabold text-gray-900 text-lg">Reunión agendada</h3>
            <p className="text-sm text-gray-500 mt-1 capitalize">{longDate(selectedDate)} · {selectedSlot}</p>
            {booked.meeting_link ? (
              <a href={booked.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 bg-brand-50 rounded-2xl px-4 py-2.5 mt-4">
                <Video className="w-4 h-4" /> Abrir link de la reunión
              </a>
            ) : (
              <p className="text-xs text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">
                Te confirmaremos el link de la videollamada. Cuando esté listo aparecerá en «Próximas reuniones».
              </p>
            )}
            <div><Button variant="soft" className="mt-5" onClick={reset}>Agendar otra</Button></div>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate({ meeting_date: selectedDate, time_slot: selectedSlot, topic: topic.trim() }); }}
            className="flex flex-col gap-5"
          >
            <CardTitle className="!mb-0">Agenda una reunión</CardTitle>
            <Field label="¿De qué quieres hablar?">
              <input required className={inputClass} placeholder="Ej. Revisar el diseño de la página de inicio" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </Field>
            <Field label="Fecha">
              <input required type="date" min={todayStr} className={inputClass} value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(''); }} />
            </Field>
            {selectedDate && (
              <div>
                <span className="text-xs font-semibold text-gray-600 mb-2 block">Hora</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {AVAILABLE_SLOTS.map((time) => {
                    const isTaken = taken.includes(time);
                    return (
                      <button
                        type="button" key={time} disabled={isTaken} onClick={() => setSelectedSlot(time)}
                        aria-pressed={selectedSlot === time}
                        className={clsx(
                          'py-2.5 rounded-2xl text-xs font-semibold border transition-colors',
                          selectedSlot === time ? 'bg-brand-600 border-brand-600 text-white'
                            : isTaken ? 'border-gray-100 bg-gray-50 text-gray-300 line-through cursor-not-allowed'
                              : 'border-gray-200 text-gray-700 hover:border-brand-400 hover:text-brand-700',
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <ErrorText>{mutation.isError && apiError(mutation.error, 'No se pudo agendar la reunión')}</ErrorText>
            <Button type="submit" loading={mutation.isPending} disabled={!selectedDate || !selectedSlot}><CalendarPlus className="w-4 h-4" /> Confirmar reunión</Button>
          </form>
        )}
      </Card>

      <div className="lg:col-span-2 flex flex-col gap-5">
        <Card className="p-6">
          <CardTitle>Próximas reuniones</CardTitle>
          {isLoading ? <Spinner className="!py-6" /> : upcoming.length === 0 ? (
            <EmptyState icon={Calendar} title="Nada agendado">Elige fecha y hora para reunirte con el equipo.</EmptyState>
          ) : (
            <div className="flex flex-col divide-y divide-brand-50">{upcoming.map((a) => <AppointmentRow key={a.id} appt={a} />)}</div>
          )}
        </Card>
        {past.length > 0 && (
          <Card className="p-6">
            <CardTitle>Anteriores</CardTitle>
            <div className="flex flex-col divide-y divide-brand-50">{past.slice(0, 6).map((a) => <AppointmentRow key={a.id} appt={a} />)}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
