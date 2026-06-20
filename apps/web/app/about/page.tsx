import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 text-slate-800 pb-24">
      {/* Hero */}
      <div className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#e04039]/5 to-transparent pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight leading-none">关于 2026 北美世界杯</h1>
          <p className="text-slate-500 text-lg font-medium">赛事规则、举办城市与场地信息</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-12 relative z-10">
        
        {/* Rules */}
        <section id="rules" className="scroll-mt-24">
          <h2 className="text-2xl font-black text-slate-800 mb-6 border-b border-slate-200/80 pb-4 tracking-tight">赛制介绍</h2>
          <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6 text-slate-600 leading-relaxed font-normal">
            <p>
              2026年国际足联世界杯（2026 FIFA World Cup）将是第23届国际足联世界杯。本届赛事将由<strong className="text-slate-900 font-bold">加拿大、墨西哥和美国</strong>三国联合举办，这也是世界杯历史上首次由三个国家联合举办。
            </p>
            <p>
              本届世界杯将迎来重大的赛制改革：参赛球队数量将从传统的32支**扩军至48支**。
            </p>
            <ul className="list-disc list-inside space-y-2 pl-4 text-slate-600 font-medium">
              <li><span className="font-bold text-slate-800">小组赛阶段</span>：48支球队分为12个小组（A组至L组），每组4支球队。</li>
              <li><span className="font-bold text-slate-800">晋级规则</span>：每个小组的前两名，以及8个成绩最好的小组第三名，将晋级到32强淘汰赛。</li>
              <li><span className="font-bold text-slate-800">淘汰赛阶段</span>：从32强开始进行单败淘汰赛，直至决出冠军。整个赛事共计将进行104场比赛。</li>
            </ul>
          </div>
        </section>

        {/* Cities */}
        <section id="cities" className="scroll-mt-24">
          <h2 className="text-2xl font-black text-slate-800 mb-6 border-b border-slate-200/80 pb-4 tracking-tight">举办城市</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
              <div className="text-3xl mb-4">🇺🇸</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">美国 (USA)</h3>
              <ul className="text-slate-500 text-sm space-y-1 font-medium">
                <li>纽约 / 新泽西</li>
                <li>达拉斯</li>
                <li>洛杉矶</li>
                <li>迈阿密</li>
                <li>亚特兰大</li>
                <li>西雅图</li>
                <li>...等11个城市</li>
              </ul>
            </div>
            
            <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
              <div className="text-3xl mb-4">🇲🇽</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">墨西哥 (Mexico)</h3>
              <ul className="text-slate-500 text-sm space-y-1 font-medium">
                <li>墨西哥城</li>
                <li>蒙特雷</li>
                <li>瓜达拉哈拉</li>
              </ul>
            </div>
            
            <div className="bg-white/75 backdrop-blur-md border border-slate-200/50 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
              <div className="text-3xl mb-4">🇨🇦</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">加拿大 (Canada)</h3>
              <ul className="text-slate-500 text-sm space-y-1 font-medium">
                <li>多伦多</li>
                <li>温哥华</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
