import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  ArrowRight,
  Bell,
  BellOff,
  Calendar as CalendarIcon,
  CheckCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he, ar, enUS, ru } from 'date-fns/locale';

const TIME_SLOTS = [
  { value: '08:00', label: '08:00' },
  { value: '09:00', label: '09:00' },
  { value: '10:00', label: '10:00' },
  { value: '11:00', label: '11:00' },
  { value: '12:00', label: '12:00' },
  { value: '13:00', label: '13:00' },
  { value: '14:00', label: '14:00' },
  { value: '15:00', label: '15:00' },
  { value: '16:00', label: '16:00' },
  { value: '17:00', label: '17:00' },
  { value: '18:00', label: '18:00' },
];

function AvailabilityAlertsContent() {
  const { t, isRTL, language } = useLanguage();
  
  const getDateLocale = () => {
    switch(language) {
      case 'he': return he;
      case 'ar': return ar;
      case 'ru': return ru;
      default: return enUS;
    }
  };
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);

  const [newPreference, setNewPreference] = useState({
    service_id: '',
    doctor_id: '',
    preferred_date: null,
    preferred_time_start: '08:00',
    preferred_time_end: '18:00'
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.PatientProfile.list(),
  });

  useEffect(() => {
    if (currentUser && patients.length > 0) {
      const profile = patients.find(p => p.user_id === currentUser.id || p.email === currentUser.email);
      setPatientProfile(profile);
    }
  }, [currentUser, patients]);

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['waitlist', patientProfile?.id],
    queryFn: () => base44.entities.WaitlistPreference.filter({ patient_id: patientProfile.id }),
    enabled: !!patientProfile?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.StaffProfile.filter({ staff_type: 'DOCTOR' }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WaitlistPreference.create({
      ...data,
      patient_id: patientProfile.id,
      is_active: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['waitlist']);
      toast.success(t('alertSaved'));
      setNewPreference({
        service_id: '',
        doctor_id: '',
        preferred_date: null,
        preferred_time_start: '08:00',
        preferred_time_end: '18:00'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WaitlistPreference.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['waitlist']);
      toast.success(t('alertRemoved'));
    }
  });

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('PatientDashboard')}>
                <Button variant="ghost" size="icon">
                  <BackIcon className="h-5 w-5" />
                </Button>
              </Link>
              <span className="text-xl font-bold text-gray-800">{t('availabilityAlert')}</span>
            </div>
            <LanguageSelector variant="minimal" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Info Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {t('availabilityAlerts')}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('getNotifiedWhen')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create New Alert */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('addNewAlert')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('selectService')}</label>
              <Select 
                value={newPreference.service_id} 
                onValueChange={(val) => setNewPreference({...newPreference, service_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectService')} />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor (Optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {t('selectDoctor')} ({t('optional')})
              </label>
              <Select 
                value={newPreference.doctor_id} 
                onValueChange={(val) => setNewPreference({...newPreference, doctor_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('anyDoctor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>
                    {t('anyDoctor')}
                  </SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specific Date */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                {t('specificDate')}
              </label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={newPreference.preferred_date}
                  onSelect={(date) => setNewPreference({...newPreference, preferred_date: date})}
                  disabled={(date) => date < new Date()}
                  className="rounded-xl border"
                  locale={getDateLocale()}
                />
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('from')}
                </label>
                <Select 
                  value={newPreference.preferred_time_start} 
                  onValueChange={(val) => setNewPreference({...newPreference, preferred_time_start: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('until')}
                </label>
                <Select 
                  value={newPreference.preferred_time_end} 
                  onValueChange={(val) => setNewPreference({...newPreference, preferred_time_end: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => createMutation.mutate({
                ...newPreference,
                preferred_date: newPreference.preferred_date ? format(newPreference.preferred_date, 'yyyy-MM-dd') : null
              })}
              disabled={!newPreference.service_id || !newPreference.preferred_date || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Bell className="h-5 w-5 mr-2" />
                  {t('saveAlert')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Existing Alerts */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              {t('myAlerts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : preferences.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BellOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('noActiveAlerts')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {preferences.filter(p => p.is_active).map((pref) => {
                  const service = services.find(s => s.id === pref.service_id);
                  const doctor = doctors.find(d => d.id === pref.doctor_id);
                  
                  return (
                    <div 
                      key={pref.id}
                      className="bg-gray-50 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Bell className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                        <p className="font-medium text-gray-800">{service?.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {doctor && <span>{doctor.first_name} {doctor.last_name}</span>}
                          {doctor && <span>•</span>}
                          {pref.preferred_date && (() => {
                            const prefDate = new Date(pref.preferred_date);
                            return !isNaN(prefDate.getTime()) && <span>{format(prefDate, 'dd/MM/yyyy')}</span>;
                          })()}
                          <span>•</span>
                          <span>{pref.preferred_time_start} - {pref.preferred_time_end}</span>
                        </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(pref.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AvailabilityAlerts() {
  return (
    <LanguageProvider>
      <AvailabilityAlertsContent />
    </LanguageProvider>
  );
}
