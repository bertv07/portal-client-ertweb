export default function Maintenance() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="px-2 mt-2">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Mantenimiento de Servicio</h2>
        <p className="text-sm text-gray-600 mb-6">Plan Anual Premium</p>
      </div>

      {/* Countdown Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 relative overflow-hidden text-center">
        <h3 className="font-semibold text-gray-700 mb-6">Próximo Pago</h3>
        
        {/* Circular Gauge */}
        <div className="flex justify-center mb-8 relative">
          <div className="w-56 h-28 overflow-hidden relative">
            <div className="w-56 h-56 rounded-full border-[20px] border-gray-100 absolute top-0" />
            <div className="w-56 h-56 rounded-full border-[20px] border-brand-700 border-b-transparent border-r-transparent absolute top-0 transform -rotate-[20deg]" />
          </div>
          <div className="absolute bottom-2 text-center flex flex-col items-center">
            <span className="text-4xl font-bold text-gray-900">15 Días</span>
          </div>
        </div>

        <div className="flex justify-between items-center px-4 mb-8">
          <div className="text-left">
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Fecha de Vencimiento</div>
            <div className="font-semibold text-gray-800">24 Oct 2024</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">Monto a Pagar</div>
            <div className="font-bold text-brand-700 text-lg">$150.00</div>
          </div>
        </div>

        <button className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3.5 rounded-full flex justify-center items-center gap-2 transition-colors shadow-lg shadow-brand-500/30">
          Pagar Ahora
        </button>
      </div>

      {/* Included Tasks Grid */}
      <div className="px-2 mt-4">
        <h3 className="font-bold text-gray-900 mb-4 text-lg">Tareas Incluidas</h3>
        <div className="grid grid-cols-2 gap-4">
          
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex flex-col gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm mb-1">Software Update</h4>
              <p className="text-xs text-gray-500 leading-tight">Actualización a la última versión...</p>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex flex-col gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm mb-1">Security Audit</h4>
              <p className="text-xs text-gray-500 leading-tight">Revisión de vulnerabilidades...</p>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex flex-col gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm mb-1">Backup Review</h4>
              <p className="text-xs text-gray-500 leading-tight">Verificación de integridad de...</p>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-50 flex flex-col gap-3 opacity-60">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div>
              <h4 className="font-bold text-gray-500 text-sm mb-1">Performance</h4>
              <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Próximo Ciclo</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
