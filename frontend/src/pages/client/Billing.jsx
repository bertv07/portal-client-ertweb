export default function Billing() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Balance Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5 mt-4">
        <h2 className="text-sm font-medium text-gray-500 mb-1">Current Balance Due</h2>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold text-gray-900">$1,250.00</span>
          <span className="text-sm font-medium text-gray-500">USD</span>
        </div>
        <button className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3.5 rounded-full flex justify-center items-center gap-2 transition-colors shadow-lg shadow-brand-500/30">
          Pay Now
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
        <h3 className="font-semibold text-gray-800 mb-6 text-lg">Recent Invoices</h3>
        
        <div className="flex flex-col gap-4">
          {/* Pending Invoice */}
          <div className="border border-brand-100 rounded-2xl p-4 flex items-center justify-between shadow-sm bg-brand-50/30">
            <div>
              <h4 className="font-bold text-gray-800 mb-0.5">INV-2023-004</h4>
              <p className="text-xs text-gray-500 mb-2">Oct 15, 2023 • $1,250.00</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                <span className="text-xs font-semibold text-brand-600">Pending</span>
              </div>
            </div>
            <button className="p-3 bg-white text-gray-400 hover:text-brand-600 rounded-xl shadow-sm border border-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </button>
          </div>

          {/* Paid Invoice 1 */}
          <div className="border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-800 mb-0.5">INV-2023-003</h4>
              <p className="text-xs text-gray-500 mb-2">Sep 15, 2023 • $1,250.00</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-semibold text-gray-500">Paid</span>
              </div>
            </div>
            <button className="p-3 bg-gray-50 text-gray-400 hover:text-brand-600 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </button>
          </div>

          {/* Paid Invoice 2 */}
          <div className="border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-800 mb-0.5">INV-2023-002</h4>
              <p className="text-xs text-gray-500 mb-2">Aug 15, 2023 • $1,250.00</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-semibold text-gray-500">Paid</span>
              </div>
            </div>
            <button className="p-3 bg-gray-50 text-gray-400 hover:text-brand-600 rounded-xl transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </button>
          </div>
        </div>

        <button className="w-full text-center text-sm font-medium text-brand-600 mt-6 hover:text-brand-800 transition-colors">
          View All Invoices
        </button>
      </div>

    </div>
  );
}
