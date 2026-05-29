interface LineChartData {
  label: string;
  value: number;
}

interface BarChartData {
  label: string;
  value: number;
}

interface ChartsProps {
  attendanceTrend: LineChartData[];
  gradePerformance: BarChartData[];
  departmentDistribution: Array<{ name: string; count: number }>;
}

export function AttendanceTrendChart({ data }: { data: LineChartData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-sm">
        No attendance history available
      </div>
    );
  }

  // Calculate coordinates for SVG
  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const minVal = 0;
  const maxVal = 100;
  const valRange = maxVal - minVal;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1 || 1)) * chartWidth;
    const ratio = (d.value - minVal) / valRange;
    const y = paddingTop + chartHeight - ratio * chartHeight;
    return { x, y, ...d };
  });

  // Assemble path instructions
  let pathD = "";
  let areaD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  return (
    <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 tracking-tight font-display">Attendance Logs Trend</h3>
          <p className="text-[10px] text-slate-500 font-medium">Overall class ratio (%) over recent periods</p>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Present Rate</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const ratio = (val - minVal) / valRange;
            const y = paddingTop + chartHeight - ratio * chartHeight;
            return (
              <g key={val} className="opacity-40">
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={width - paddingRight} 
                  y2={y} 
                  stroke="#e2e8f0" 
                  strokeWidth="1" 
                  strokeDasharray="4,4" 
                />
                <text 
                  x={paddingLeft - 10} 
                  y={y + 3} 
                  fill="#94a3b8" 
                  fontSize="8" 
                  textAnchor="end"
                  className="font-mono font-medium"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Filled Area */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {/* Connected Line */}
          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke="#2563eb" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Intersect Data Dots */}
          {points.map((p, idx) => (
            <g key={idx} className="group">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4.5" 
                fill="#ffffff" 
                stroke="#2563eb" 
                strokeWidth="2.5" 
                className="transition-all hover:r-6 cursor-pointer"
              />
              <text 
                x={p.x} 
                y={p.y - 10} 
                fill="#1e293b" 
                fontSize="9" 
                fontWeight="bold" 
                textAnchor="middle"
                className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 font-mono"
              >
                {p.value}%
              </text>
            </g>
          ))}

          {/* X Axis labels */}
          {points.map((p, idx) => (
            <text 
              key={idx} 
              x={p.x} 
              y={height - 5} 
              fill="#64748b" 
              fontSize="9" 
              textAnchor="middle"
              className="font-medium"
            >
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function SubjectPerformanceChart({ data }: { data: BarChartData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-sm">
        No grades recorded yet
      </div>
    );
  }

  const maxVal = 100;

  return (
    <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-800 tracking-tight font-display">Subject Scores & CGPA Performance</h3>
        <p className="text-[10px] text-slate-500 font-medium">Average standard scoring on subject index reviews</p>
      </div>

      <div className="space-y-4">
        {data.map((d, index) => {
          const pct = Math.min((d.value / maxVal) * 100, 100);
          
          let alertColor = "bg-blue-600";
          let textColor = "text-blue-600";
          if (d.value < 50) {
            alertColor = "bg-red-500";
            textColor = "text-red-500";
          } else if (d.value < 75) {
            alertColor = "bg-amber-500";
            textColor = "text-amber-500";
          } else {
            alertColor = "bg-emerald-500";
            textColor = "text-emerald-500";
          }

          return (
            <div key={index} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 truncate max-w-[200px]">{d.label}</span>
                <span className={`font-bold font-mono ${textColor}`}>{d.value} / {maxVal}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full ${alertColor} rounded-full transition-all duration-500 ease-out`} 
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DepartmentDonutChart({ data }: { data: Array<{ name: string; count: number }> }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  // Fallback if empty
  if (total === 0) {
    return (
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
        <h3 className="text-xs font-bold text-slate-800 mb-4 font-display">Department Strength</h3>
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm h-48">
          No records registered
        </div>
      </div>
    );
  }

  const colors = [
    "bg-blue-600 border-blue-500",
    "bg-amber-500 border-amber-400",
    "bg-violet-600 border-violet-500",
    "bg-emerald-500 border-emerald-400",
    "bg-sky-500 border-sky-400",
  ];

  return (
    <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-800 tracking-tight font-display">Department Enrolment</h3>
        <p className="text-[10px] text-slate-500 font-medium">Student count registered across distinct departments</p>
      </div>

      <div className="flex flex-col space-y-4">
        {/* Render horizontal bento-row percentages */}
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex w-full">
          {data.map((d, index) => {
            const pct = (d.count / total) * 100;
            const bgClass = colors[index % colors.length].split(" ")[0];
            return (
              <div 
                key={index} 
                className={`h-full ${bgClass} transition-all`} 
                style={{ width: `${pct}%` }} 
                title={`${d.name}: ${d.count} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>

        {/* Legend stats */}
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {data.map((d, index) => {
            const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
            const dotColor = colors[index % colors.length].split(" ")[0];
            return (
              <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className={`h-3 w-3 rounded-md ${dotColor} shrink-0`}></span>
                  <span className="font-semibold text-slate-700 truncate">{d.name}</span>
                </div>
                <div className="flex items-center space-x-2 ml-2 shrink-0">
                  <span className="font-bold text-slate-900">{d.count} students</span>
                  <span className="text-slate-400 text-3xs font-mono">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
