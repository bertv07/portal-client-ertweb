export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Main Status Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 relative overflow-hidden">
        {/* Cover Image/Header Area - placeholder */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-pink-300 to-brand-300 opacity-80" />
        
        <div className="relative mt-8">
          <div className="inline-block bg-white px-4 py-1.5 rounded-full text-sm font-semibold text-gray-800 shadow-sm border border-gray-100 mb-6">
            Proyecto muestra
          </div>

          <div className="flex justify-between items-center mb-8">
            <span className="font-semibold text-gray-700">Duración aproximada</span>
            <span className="text-gray-500 text-sm">1 mes</span>
          </div>

          {/* Circular Gauge Placeholder */}
          <div className="flex justify-center mb-8 relative">
            <div className="w-48 h-24 overflow-hidden relative">
              <div className="w-48 h-48 rounded-full border-[16px] border-gray-100 absolute top-0" />
              <div className="w-48 h-48 rounded-full border-[16px] border-brand-700 border-b-transparent border-r-transparent absolute top-0 transform -rotate-45" />
            </div>
            <div className="absolute bottom-0 text-center flex flex-col items-center">
              <span className="text-3xl font-bold text-gray-900">1 Mes</span>
            </div>
          </div>

          {/* Process Stats */}
          <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-50 pt-6">
            <div>
              <div className="text-xs text-gray-400 mb-1">Proceso</div>
              <div className="font-semibold text-gray-800 text-sm">Desarrollo</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Tiempo aproximado</div>
              <div className="font-semibold text-gray-800 text-sm">2 Semanas</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Tiempo restante</div>
              <div className="font-semibold text-gray-800 text-sm">2 Semanas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Últimas actualizaciones</h3>
        <div className="flex flex-wrap gap-2">
          {['Diseño listo', 'Diseño aprobado', 'Pdf recibidos', 'Cotización lista'].map((item) => (
            <div key={item} className="bg-gray-100 text-gray-600 px-4 py-3 rounded-2xl text-xs font-medium text-center flex-1 min-w-[80px]">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Missing Files */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Archivos faltantes</h3>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-brand-400 text-white p-3 rounded-2xl flex items-center justify-center gap-2">
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span className="text-xs font-medium">Imagen header</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
