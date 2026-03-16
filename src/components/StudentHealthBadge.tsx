import React from 'react';
import { AlertCircle, HeartPulse, ShieldAlert, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface StudentHealthBadgeProps {
  alerts: string[];
  dispensationEnd?: string;
  className?: string;
}

export function StudentHealthBadge({ alerts, dispensationEnd, className }: StudentHealthBadgeProps) {
  const isDispensed = dispensationEnd && new Date(dispensationEnd) > new Date();
  
  if (!alerts?.length && !isDispensed) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {isDispensed && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 shadow-sm">
          <ShieldAlert className="w-3.5 h-3.5 mr-1" />
          Dispensé(e)
        </span>
      )}
      
      {alerts?.map((alert, index) => {
        let Icon = Activity;
        let colorClass = "bg-amber-100 text-amber-800 border-amber-200";
        
        if (alert.toLowerCase().includes('asthme')) {
          Icon = HeartPulse;
          colorClass = "bg-blue-100 text-blue-800 border-blue-200";
        } else if (alert.toLowerCase().includes('pai')) {
          Icon = AlertCircle;
          colorClass = "bg-rose-100 text-rose-800 border-rose-200";
        }

        return (
          <span 
            key={index} 
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm",
              colorClass
            )}
            title={alert}
          >
            <Icon className="w-3.5 h-3.5 mr-1" />
            {alert}
          </span>
        );
      })}
    </div>
  );
}
