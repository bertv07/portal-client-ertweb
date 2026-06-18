export default function Schedule() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="text-center px-4 mt-2 mb-2">
        <h2 className="text-2xl font-bold text-brand-700 mb-2">Schedule a Call</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Select a suitable day and time for our introductory consultation. We'll discuss your goals and how we can help you achieve them.
        </p>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-brand-500/5">
        
        {/* Calendar Header */}
        <div className="flex justify-between items-center mb-6">
          <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h3 className="font-bold text-gray-900">October 2023</h3>
          <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center mb-6">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`h-${i}`} className="text-xs font-semibold text-gray-400 mb-2">{day}</div>
          ))}
          
          {/* Empty days */}
          <div className="p-2"></div><div className="p-2"></div>
          
          {/* Days 1-25 mockup */}
          {[...Array(25)].map((_, i) => {
            const day = i + 1;
            const isSelected = day === 15;
            return (
              <div key={`d-${day}`} className="flex justify-center items-center py-1.5">
                <button className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  ${isSelected ? 'bg-brand-700 text-white shadow-md shadow-brand-500/40' : 'text-gray-700 hover:bg-gray-100'}
                `}>
                  {day}
                </button>
              </div>
            );
          })}
        </div>

        {/* Time Slots */}
        <div className="border-t border-gray-100 pt-6 mb-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Available Times (Oct 15)</h4>
          <div className="grid grid-cols-3 gap-3">
            {['09:00 AM', '09:30 AM', '10:00 AM'].map(time => (
              <button key={time} className="py-2.5 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600 transition-colors">
                {time}
              </button>
            ))}
            <button className="py-2.5 rounded-xl text-xs font-bold text-brand-700 bg-brand-100 border-2 border-brand-300 transition-colors">
              11:00 AM
            </button>
            {['01:00 PM', '02:30 PM'].map(time => (
              <button key={time} className="py-2.5 rounded-xl text-xs font-semibold text-gray-400 border border-gray-100 bg-gray-50 cursor-not-allowed">
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-brand-50 rounded-2xl p-4 flex gap-3 mb-6">
          <div className="text-brand-600 mt-0.5 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h5 className="text-sm font-semibold text-brand-900 mb-1">Introductory Consultation</h5>
            <p className="text-xs text-brand-700/80 leading-relaxed">
              A 30-minute video call to discuss your current challenges and explore how our premium services can assist you. A Google Meet link will be sent upon confirmation.
            </p>
          </div>
        </div>

        <button className="w-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3.5 rounded-full flex justify-center items-center gap-2 transition-colors shadow-lg shadow-brand-500/30">
          Confirm Schedule
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </button>

      </div>
    </div>
  );
}
