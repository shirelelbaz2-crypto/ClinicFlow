import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  ArrowLeft, 
  ArrowRight,
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { format, isSameDay, isAfter, startOfDay } from 'date-fns';
import { he, ar, enUS, ru } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";
import { AlertCircle } from 'lucide-react';

function BookAppointmentContent() {
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
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const referralId = urlParams.get('referral_id');

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

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

  const { data: referral } = useQuery({
    queryKey: ['referral', referralId],
    queryFn: async () => {
      const referrals = await base44.entities.Referral.filter({ id: referralId });
      return referrals[0];
    },
    enabled: !!referralId,
  });

  useEffect(() => {
    if (referral?.service_id) {
      setSelectedService(referral.service_id);
    }
  }, [referral]);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.StaffProfile.filter({ staff_type: 'DOCTOR' }),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', patientProfile?.id],
    queryFn: () => base44.entities.Appointment.filter({ patient_id: patientProfile.id }),
    enabled: !!patientProfile?.id,
  });

  // Check if patient already has an appointment for this referral
  const hasExistingAppointment = referralId && appointments.some(apt => 
    apt.referral_id === referralId && 
    apt.status !== 'CANCELLED' && 
    apt.status !== 'NO_SHOW'
  );

  const { data: slots = [] } = useQuery({
    queryKey: ['slots', selectedService, selectedDoctor],
    queryFn: () => base44.entities.AppointmentSlot.filter({
      service_id: selectedService,
      ...(selectedDoctor && { doctor_id: selectedDoctor }),
      status: 'OPEN'
    }),
    enabled: !!selectedService,
  });

  const availableSlots = slots.filter(slot => 
    isAfter(new Date(slot.start_time), new Date()) &&
    slot.booked_count < slot.capacity
  );

  const slotsForDate = selectedDate 
    ? availableSlots.filter(slot => isSameDay(new Date(slot.start_time), selectedDate))
    : [];

  const datesWithSlots = availableSlots.map(slot => 
    startOfDay(new Date(slot.start_time)).toISOString()
  );
  const uniqueDates = [...new Set(datesWithSlots)];

  const createAppointmentMutation = useMutation({
    mutationFn: async (data) => {
      // Get service duration
      const service = getService(selectedService);
      const durationMinutes = service?.default_duration_min || 30;
      const slotsNeeded = Math.ceil(durationMinutes / 5);
      
      // Find consecutive 5-minute slots
      const slotStartTime = new Date(selectedSlot.start_time);
      const consecutiveSlots = [];
      
      for (let i = 0; i < slotsNeeded; i++) {
        const expectedTime = new Date(slotStartTime.getTime() + i * 5 * 60000);
        const slot = availableSlots.find(s => 
          new Date(s.start_time).getTime() === expectedTime.getTime() &&
          s.doctor_id === selectedSlot.doctor_id &&
          s.service_id === selectedSlot.service_id
        );
        
        if (slot) {
          consecutiveSlots.push(slot);
        } else {
          throw new Error(isRTL ? 'אין מספיק משבצות רצופות זמינות' : 'Not enough consecutive slots available');
        }
      }
      
      // Create appointment
      const endTime = new Date(slotStartTime.getTime() + durationMinutes * 60000);
      const appointment = await base44.entities.Appointment.create({
        ...data,
        appointment_date: selectedSlot.start_time,
        end_time: endTime.toISOString()
      });
      
      // Update all consecutive slots
      for (const slot of consecutiveSlots) {
        await base44.entities.AppointmentSlot.update(slot.id, {
          booked_count: (slot.booked_count || 0) + 1,
          status: slot.booked_count + 1 >= slot.capacity ? 'BOOKED' : 'OPEN'
        });
      }

      // Update referral if exists
      if (referralId) {
        await base44.entities.Referral.update(referralId, {
          status: 'APPOINTMENT_SCHEDULED',
          appointment_id: appointment.id
        });
      }

      return appointment;
    },
    onSuccess: () => {
      setBookingSuccess(true);
      queryClient.invalidateQueries(['appointments']);
      queryClient.invalidateQueries(['slots']);
      queryClient.invalidateQueries(['referrals']);
    }
  });

  const handleBookAppointment = () => {
    if (!selectedSlot || !patientProfile) return;

    createAppointmentMutation.mutate({
      slot_id: selectedSlot.id,
      patient_id: patientProfile.id,
      referral_id: referralId || null,
      service_id: selectedService,
      doctor_id: selectedSlot.doctor_id,
      site_id: selectedSlot.site_id,
      appointment_date: selectedSlot.start_time,
      status: 'CONFIRMED',
      source: referralId ? 'REFERRAL' : 'SELF_SERVICE'
    });
  };

  const getDoctor = (doctorId) => doctors.find(d => d.id === doctorId);
  const getSite = (siteId) => sites.find(s => s.id === siteId);
  const getService = (serviceId) => services.find(s => s.id === serviceId);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (!patientProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Block booking if appointment already exists for this referral
  if (hasExistingAppointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Link to={createPageUrl('PatientDashboard')}>
                  <Button variant="ghost" size="icon">
                    <BackIcon className="h-5 w-5" />
                  </Button>
                </Link>
                <span className="text-xl font-bold text-gray-800">{t('bookAppointment')}</span>
              </div>
              <LanguageSelector variant="minimal" />
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                {isRTL ? 'כבר קיים תור פעיל' : 'Active Appointment Exists'}
              </h2>
              <p className="text-gray-600 mb-6">
                {isRTL 
                  ? 'כבר קיים לך תור פעיל עבור הפניה זו. לא ניתן לקבוע תור נוסף.'
                  : 'You already have an active appointment for this referral. Cannot book another appointment.'}
              </p>
              <Link to={createPageUrl('PatientDashboard')}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  {t('backToDashboard')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t('appointmentBooked')}
            </h2>
            <p className="text-gray-500 mb-6">
              {isRTL 
                ? 'התור נקבע בהצלחה. תקבל אישור במייל.'
                : 'Your appointment has been confirmed. You will receive a confirmation email.'}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('date')}:</span>
                  <span className="font-medium">{format(new Date(selectedSlot.start_time), 'dd/MM/yyyy', { locale: getDateLocale() })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('time')}:</span>
                  <span className="font-medium">{format(new Date(selectedSlot.start_time), 'HH:mm', { locale: getDateLocale() })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('doctor')}:</span>
                  <span className="font-medium">
                    {getDoctor(selectedSlot.doctor_id)?.first_name} {getDoctor(selectedSlot.doctor_id)?.last_name}
                  </span>
                </div>
              </div>
            </div>
            <Link to={createPageUrl('PatientDashboard')}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                {t('backToDashboard')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('PatientDashboard')}>
                <Button variant="ghost" size="icon">
                  <BackIcon className="h-5 w-5" />
                </Button>
              </Link>
              <span className="text-xl font-bold text-gray-800">{t('bookAppointment')}</span>
            </div>
            <LanguageSelector variant="minimal" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all",
                step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "w-16 h-1 mx-2 rounded",
                  step > s ? "bg-blue-600" : "bg-gray-200"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Service & Doctor */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{isRTL ? 'בחר שירות ורופא' : 'Select Service & Doctor'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('selectService')}</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="h-12">
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('selectDoctor')}</label>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={isRTL ? 'כל הרופאים' : 'All Doctors'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>
                      {isRTL ? 'כל הרופאים' : 'All Doctors'}
                    </SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.first_name} {doctor.last_name}
                        {doctor.specialty && ` - ${doctor.specialty}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                disabled={!selectedService}
                onClick={() => setStep(2)}
              >
                {t('next')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{isRTL ? 'בחר תאריך ושעה' : 'Select Date & Time'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const dateStr = startOfDay(date).toISOString();
                    return !uniqueDates.includes(dateStr);
                  }}
                  className="rounded-xl border"
                  locale={getDateLocale()}
                />
              </div>

              {selectedDate && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">
                    {isRTL ? 'משבצות זמינות' : 'Available Slots'}
                  </h4>
                  {slotsForDate.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">{t('noAvailableSlots')}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slotsForDate.map((slot) => {
                        const doctor = getDoctor(slot.doctor_id);
                        return (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "p-3 rounded-xl border text-center transition-all",
                              selectedSlot?.id === slot.id
                                ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600"
                                : "border-gray-200 hover:border-blue-300"
                            )}
                          >
                            <p className="font-semibold text-gray-800">
                              {format(new Date(slot.start_time), 'HH:mm', { locale: getDateLocale() })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doctor?.first_name} {doctor?.last_name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  {t('back')}
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                >
                  {t('next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedSlot && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{isRTL ? 'אישור התור' : 'Confirm Appointment'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('selectDate')}</p>
                    <p className="font-medium">{format(new Date(selectedSlot.start_time), 'EEEE, dd/MM/yyyy', { locale: getDateLocale() })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('selectTime')}</p>
                    <p className="font-medium">{format(new Date(selectedSlot.start_time), 'HH:mm', { locale: getDateLocale() })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('selectDoctor')}</p>
                    <p className="font-medium">
                      {getDoctor(selectedSlot.doctor_id)?.first_name} {getDoctor(selectedSlot.doctor_id)?.last_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('location')}</p>
                    <p className="font-medium">{getSite(selectedSlot.site_id)?.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  {t('back')}
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleBookAppointment}
                  disabled={createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    t('confirmBooking')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function BookAppointment() {
  return (
    <LanguageProvider>
      <BookAppointmentContent />
    </LanguageProvider>
  );
}
