export default function Loading() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0d1114] text-white items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[350px] bg-gradient-to-b from-emerald-900/30 via-emerald-900/10 to-transparent -z-10 pointer-events-none"></div>
      
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          <span className="text-sm font-black text-white tracking-widest uppercase">SYNCING LIVE ODDS</span>
        </div>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Connecting to Quant Engines...</p>
      </div>
    </div>
  );
}
