import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Baby, Calendar } from 'lucide-react';
import { differenceInWeeks, addWeeks, format } from 'date-fns';

export default function PregnancyTracker({ pregnancyStartDate }) {
  const { t, isRTL } = useLanguage();
  
  if (!pregnancyStartDate) return null;

  const startDate = new Date(pregnancyStartDate);
  if (isNaN(startDate.getTime())) return null;
  
  const today = new Date();
  const currentWeek = differenceInWeeks(today, startDate);
  const dueDate = addWeeks(startDate, 40);
  const progress = Math.min((currentWeek / 40) * 100, 100);

  if (currentWeek < 0 || currentWeek > 42) return null;

  return (
    <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
          <Baby className="h-6 w-6 text-pink-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{t('pregnancyWeek')}</p>
          <p className="text-2xl font-bold text-gray-800">{currentWeek}</p>
        </div>
      </div>

      <div className="relative h-3 bg-white rounded-full overflow-hidden mb-4">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4" />
        <span>
          {isRTL ? 'תאריך לידה משוער:' : 'Due date:'} {format(dueDate, 'dd/MM/yyyy')}
        </span>
      </div>
    </div>
  );
}
