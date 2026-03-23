import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, Clock, User, FileText } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FollowUpList({ referrals, patients, services }) {
  const { t, isRTL } = useLanguage();

  const getPatient = (patientId) => patients?.find(p => p.id === patientId);
  const getService = (serviceId) => services?.find(s => s.id === serviceId);

  const sortedReferrals = [...referrals].sort((a, b) => {
    const daysA = differenceInDays(new Date(), new Date(a.referral_date));
    const daysB = differenceInDays(new Date(), new Date(b.referral_date));
    return daysB - daysA;
  });

  if (sortedReferrals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{isRTL ? 'אין מטופלים ברשימת המעקב' : 'No patients in follow-up list'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedReferrals.map((referral) => {
        const patient = getPatient(referral.patient_id);
        const service = getService(referral.service_id);
        const daysSinceReferral = differenceInDays(new Date(), new Date(referral.referral_date));
        
        return (
          <div 
            key={referral.id}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {patient?.first_name} {patient?.last_name}
                  </h4>
                  <p className="text-sm text-gray-500">{patient?.national_id}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <FileText className="h-4 w-4" />
                      {service?.name}
                    </span>
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      {daysSinceReferral} {t('daysWithoutScheduling')}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {patient?.phone && (
                  <a href={`tel:${patient.phone}`}>
                    <Button variant="outline" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                <Link to={createPageUrl('SecretaryBooking') + `?patient_id=${patient?.id}&referral_id=${referral.id}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('bookAppointment')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
