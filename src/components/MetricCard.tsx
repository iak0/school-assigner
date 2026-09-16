import React from "react";
import { HelpCircle } from "lucide-react";

const Tooltip: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-1 w-64 p-2.5 bg-slate-900 text-slate-100 text-[10px] rounded-lg shadow-xl z-30 border border-slate-700 leading-relaxed">
      {children}
    </div>
  );
};

interface TooltipContentProps {
  title: React.ReactNode;
  description: React.ReactNode;
  formula?: React.ReactNode;
  note?: React.ReactNode;
}

const TooltipContent: React.FC<TooltipContentProps> = ({
  title,
  description,
  formula,
  note,
}) => {
  return (
    <>
      <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
        <span>ℹ️</span> {title}
      </div>
      <p className="mb-1.5 text-slate-300">{description}</p>
      {formula && (
        <div className="space-y-0.5 font-mono text-[9px] bg-slate-800 p-1.5 rounded text-slate-300 mb-1.5">
          {formula}
        </div>
      )}
      {note && (
        <p className="mt-1.5 text-slate-400 text-[9px]">{note}</p>
      )}
    </>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subLabel?: string;
  iconBgColor: string;
  iconColor: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  tooltip?: {
    title: React.ReactNode;
    description: React.ReactNode;
    formula?: React.ReactNode;
    note?: React.ReactNode;
  };
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  value,
  label,
  subLabel,
  iconBgColor,
  iconColor,
  textColor,
  borderColor,
  bgColor,
  tooltip,
  children,
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  if (tooltip) {
    return (
      <div className={`relative ${bgColor} border ${borderColor} rounded-lg p-3 flex items-center gap-3`}>
        <div className={`w-9 h-9 rounded-lg ${iconBgColor} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xl font-extrabold ${textColor} flex items-center gap-1`}>
            {value}
            {subLabel && <span className="text-xs font-normal">{subLabel}</span>}
          </div>
          <div className={`text-xs font-medium ${textColor}`}>{label}</div>
        </div>
        <button
          type="button"
          className={`text-opacity-70 hover:opacity-100 p-0.5 rounded transition-colors flex-shrink-0`}
          onClick={() => setShowTooltip(!showTooltip)}
          title="More info"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
        <Tooltip isOpen={showTooltip} onClose={() => setShowTooltip(false)}>
          <TooltipContent
            title={tooltip.title}
            description={tooltip.description}
            formula={tooltip.formula}
            note={tooltip.note}
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-3 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-lg ${iconBgColor} ${iconColor} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        {children ? (
          children
        ) : (
          <>
            <div className={`text-xl font-extrabold ${textColor}`}>{value}</div>
            <div className={`text-xs font-medium ${textColor}`}>{label}</div>
          </>
        )}
      </div>
    </div>
  );
};