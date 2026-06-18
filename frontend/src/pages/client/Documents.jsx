export default function Documents() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 mt-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Información Necesaria</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Sube los documentos requeridos para avanzar con tu proyecto.
        </p>

        <h3 className="font-semibold text-gray-800 mb-4">Documentos Pendientes</h3>
        
        <div className="flex flex-col gap-4 mb-8">
          {/* Pending Item 1 */}
          <div className="border border-brand-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-800">Identificación Oficial</h4>
                <p className="text-xs text-red-500 mt-0.5">Requerido</p>
              </div>
            </div>
            <button className="bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors shadow-md shadow-brand-500/20">
              Subir
            </button>
          </div>

          {/* Pending Item 2 */}
          <div className="border border-brand-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-800">Contrato Firmado</h4>
                <p className="text-xs text-red-500 mt-0.5">Requerido</p>
              </div>
            </div>
            <button className="bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors shadow-md shadow-brand-500/20">
              Subir
            </button>
          </div>
        </div>

        {/* General Upload Area */}
        <div className="border-2 border-dashed border-brand-300 rounded-[32px] p-8 text-center flex flex-col items-center justify-center bg-brand-50/50 mb-8 transition-colors hover:bg-brand-50">
          <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-500/30 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </div>
          <h3 className="font-bold text-brand-900 text-lg mb-1">Sube un archivo nuevo</h3>
          <p className="text-xs text-gray-500 mb-6">PDF, JPG, PNG hasta 10MB</p>
          <button className="bg-white border border-gray-200 text-gray-700 font-medium px-6 py-2.5 rounded-full text-sm shadow-sm hover:bg-gray-50 transition-colors">
            Seleccionar Archivo
          </button>
        </div>

        <h3 className="font-semibold text-gray-800 mb-4">Documentos Subidos</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-gray-50 relative overflow-hidden">
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500"></div>
            <div className="mb-3 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <h4 className="text-xs font-semibold text-gray-800 truncate">Imagen header1.jpg</h4>
            <p className="text-[10px] text-gray-500 mt-1">Aprobado</p>
          </div>
          
          <div className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-gray-50 relative overflow-hidden">
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-yellow-400"></div>
            <div className="mb-3 text-brand-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <h4 className="text-xs font-semibold text-gray-800 truncate">Brief_inicial.pdf</h4>
            <p className="text-[10px] text-gray-500 mt-1">En revisión</p>
          </div>

          <div className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-gray-50 relative overflow-hidden">
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500"></div>
            <div className="mb-3 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <h4 className="text-xs font-semibold text-gray-800 truncate">Comprobante.pdf</h4>
            <p className="text-[10px] text-gray-500 mt-1">Aprobado</p>
          </div>
        </div>

      </div>
    </div>
  );
}
