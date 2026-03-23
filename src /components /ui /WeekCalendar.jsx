import React from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from '../LanguageContext';

export default function WeekCalendar({ 
  selectedDate, 
  onDateSelect, 
  appointments = [],
  weekStart,
  onWeekChange
}) {
  const { isRTL, t } = useLanguage();
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  const getAppointmentsForDay = (date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return !isNaN(aptDate.getTime()) && isSameDay(aptDate, date);
    });
  };

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          className="rounded-full hover:bg-blue-50"
        >
          <PrevIcon className="h-5 w-5 text-gray-600" />
        </Button>
        
        <h3 className="text-lg font-semibold text-gray-800">
          {format(weekStart, 'MMMM yyyy')}
        </h3>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          className="rounded-full hover:bg-blue-50"
        >
          <NextIcon className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const dayIsToday = isToday(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl transition-all duration-200",
                "hover:bg-blue-50",
                isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                dayIsToday && !isSelected && "ring-2 ring-blue-300"
              )}
            >
              <span className={cn(
                "text-xs font-medium mb-1",
                isSelected ? "text-blue-100" : "text-gray-500"
              )}>
                {t(dayNames[day.getDay()])}
              </span>
              <span className={cn(
                "text-lg font-semibold",
                isSelected ? "text-white" : "text-gray-800"
              )}>
                {format(day, 'd')}
              </span>
              {dayAppointments.length > 0 && (
                <div className={cn(
                  "mt-1 w-1.5 h-1.5 rounded-full",
                  isSelected ? "bg-white" : "bg-green-500"
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
