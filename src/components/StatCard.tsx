import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: "blue" | "emerald" | "amber" | "violet" | "indigo";
}

export default function StatCard({ 
  title, 
  value, 
  icon: IconComponent, 
  description, 
  color = "blue" 
}: StatCardProps) {
  
  const getColorStyles = () => {
    switch (color) {
      case "emerald":
        return {
          bg: "bg-emerald-50",
          icon: "text-emerald-600 dark:text-emerald-400",
          border: "border-emerald-100",
          ring: "ring-emerald-500/5",
        };
      case "amber":
        return {
          bg: "bg-amber-50",
          icon: "text-amber-600 dark:text-amber-400",
          border: "border-amber-100",
          ring: "ring-amber-500/5",
        };
      case "violet":
        return {
          bg: "bg-violet-50",
          icon: "text-violet-600 dark:text-violet-400",
          border: "border-violet-100",
          ring: "ring-violet-500/5",
        };
      case "indigo":
        return {
          bg: "bg-indigo-50",
          icon: "text-indigo-600 dark:text-indigo-400",
          border: "border-indigo-100",
          ring: "ring-indigo-500/5",
        };
      case "blue":
      default:
        return {
          bg: "bg-blue-50",
          icon: "text-blue-600 dark:text-blue-400",
          border: "border-blue-100",
          ring: "ring-blue-500/5",
        };
    }
  };

  const style = getColorStyles();

  return (
    <div className={`bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm transition-all flex items-start space-x-3.5`}>
      <div className={`p-2.5 rounded-lg ${style.bg} border ${style.border} shrink-0`}>
        <IconComponent className={`h-5.5 w-5.5 ${style.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-550 uppercase tracking-wider leading-none">{title}</p>
        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 mt-2.5 font-display">{value}</h3>
        {description && (
          <p className="text-[11px] text-slate-450 mt-1.5 truncate font-medium">{description}</p>
        )}
      </div>
    </div>
  );
}
