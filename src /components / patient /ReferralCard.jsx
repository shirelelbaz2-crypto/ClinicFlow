import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ReferralCard({ referral, service }) {
  const { t, isRTL } = useLanguage();
  
  const isExpired = referral.expiry_date && isAfter(new Date(), new Date(referral.expiry_date));
  const isScheduled = referral.status === 'APPOINTMENT_SCHEDULED';
  
  const statusColors = {
    NEW: 'bg-blue-100 text-blue-700',
    NOTIFIED_PATIENT: 'bg-yellow-100 text-yellow-700',
    APPOINTMENT_SCHEDULED: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">{service?.name || 'Service'}</h4>
            <p className="text-sm text-gray-500">{referral.referring_doctor}</p>
          </div>
        </div>
        <Badge className={statusColors[isExpired ? 'EXPIRED' : referral.status]}>
          {isExpired ? t('referralExpired') : isScheduled ? t('confirmed') : t('referralValid')}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
        {referral.referral_date && (() => {
          const refDate = new Date(referral.referral_date);
          return !isNaN(refDate.getTime()) && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{format(refDate, 'dd/MM/yyyy')}</span>
            </div>
          );
        })()}
        {referral.expiry_date && (() => {
          const expDate = new Date(referral.expiry_date);
          return !isNaN(expDate.getTime()) && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                {isRTL ? 'בתוקף עד:' : 'Valid until:'} {format(expDate, 'dd/MM/yyyy')}
              </span>
            </div>
          );
        })()}
      </div>

      {!isScheduled && !isExpired && (
        <Link to={createPageUrl('BookAppointment') + `?referral_id=${referral.id}`}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Calendar className="h-4 w-4 mr-2" />
            {t('scheduleNow')}
          </Button>
        </Link>
      )}

      {isScheduled && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">{t('appointmentBooked')}</span>
        </div>
      )}

      {isExpired && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{t('referralExpired')}</span>
        </div>
      )}
    </div>
  );
}
