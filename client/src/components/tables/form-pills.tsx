import { memo } from "react";

interface FormPillsProps {
  form: string;
  maxPills?: number;
}

function FormPillsComponent({ form, maxPills }: FormPillsProps) {
  if (!form) return null;
  
  const results = form.toUpperCase().split("").slice(0, maxPills ?? form.length);
  
  return (
    <div className="flex items-center gap-0.5" role="list" aria-label="Recent form">
      {results.map((result, idx) => {
        let bgClass = "bg-muted";
        let ariaLabel = "Unknown";
        
        switch (result) {
          case "W":
            bgClass = "bg-emerald-500";
            ariaLabel = "Win";
            break;
          case "D":
            bgClass = "bg-amber-500";
            ariaLabel = "Draw";
            break;
          case "L":
            bgClass = "bg-red-500";
            ariaLabel = "Loss";
            break;
        }
        
        return (
          <div
            key={idx}
            className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold text-white ${bgClass}`}
            role="listitem"
            aria-label={ariaLabel}
            data-testid={`form-pill-${idx}`}
          >
            {result}
          </div>
        );
      })}
    </div>
  );
}

export const FormPills = memo(FormPillsComponent);
