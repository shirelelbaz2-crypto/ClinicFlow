import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Search
} from 'lucide-react';
import { format, isSameDay, isAfter, startOfDay } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

function SecretaryBookingContent() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const patientIdParam = urlParams.get('patient_id');
  const referralIdParam = urlParams.get('referral_id');

  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.PatientProfile.list(),
  });

  const { data: referral } = useQuery({
    queryKey: ['referral', referralIdParam],
    queryFn: async () => {
      const referrals = await base44.entities.Referral.filter({ id: referralIdParam });
      return referrals[0];
    },
    enabled: !!referralIdParam,
  });

  useEffect(() => {
    if (patientIdParam && patients.length > 0) {
      const patient = patients.find(p => p.id === patientIdParam);
      if (patient) {
        setSelectedPatient(patient);
        setStep(2);
      }
    }
  }, [patientIdParam, patients]);

  useEffect(() => {
    if (referral?.service_id) {
      setSelectedService(referral.service_id);
    }
  }, [referral]);

  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(search) ||
      p.last_name?.toLowerCase().includes(search) ||
      p.national_id?.includes(search)
    );
  });

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
      const appointment = await base44.entities.Appointment.create(data);
      
      await base44.entities.AppointmentSlot.update(selectedSlot.id, {
        booked_count: (selectedSlot.booked_count || 0) + 1,
        status: selectedSlot.booked_count + 1 >= selectedSlot.capacity ? 'BOOKED' : 'OPEN'
      });

      if (referralIdParam) {
        await base44.entities.Referral.update(referralIdParam, {
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
    if (!selectedSlot || !selectedPatient) return;

    createAppointmentMutation.mutate({
      slot_id: selectedSlot.id,
      patient_id: selectedPatient.id,
      referral_id: referralIdParam || null,
      service_id: selectedService,
      doctor_id: selectedSlot.doctor_id,
      site_id: selectedSlot.site_id,
      appointment_date: selectedSlot.start_time,
      status: 'CONFIRMED',
      source: 'SECRETARY'
    });
  };

  const getDoctor = (doctorId) => doctors.find(d => d.id === doctorId);
  const getSite = (siteId) => sites.find(s => s.id === siteId);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-0 shadow-lg">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t('appointmentBooked')}
            </h2>
            <p className="text-gray-500 mb-6">
              {t('appointmentBookedFor')} {selectedPatient?.first_name} {selectedPatient?.last_name}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('date')}:</span>
                  <span className="font-medium">{format(new Date(selectedSlot.start_time), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('time')}:</span>
                  <span className="font-medium">{format(new Date(selectedSlot.start_time), 'HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('doctor')}:</span>
                  <span className="font-medium">
                    {getDoctor(selectedSlot.doctor_id)?.first_name} {getDoctor(selectedSlot.doctor_id)?.last_name}
                  </span>
                </div>
              </div>
            </div>
            <Link to={createPageUrl('SecretaryDashboard')}>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                {t('dashboard')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('SecretaryDashboard')}>
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
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all",
                step >= s ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {s}
              </div>
              {s < 4 && (
                <div className={cn(
                  "w-12 h-1 mx-2 rounded",
                  step > s ? "bg-green-600" : "bg-gray-200"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Patient */}
        {step === 1 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{t('selectPatient')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchByNameOrId')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchTerm && (
                <div className="border rounded-xl max-h-64 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">
                      {t('noPatientsFound')}
                    </p>
                  ) : (
                    filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setStep(2);
                        }}
                        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b last:border-0"
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                          <p className="text-sm text-gray-500">{patient.national_id}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Service & Doctor */}
        {step === 2 && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{isRTL ? 'בחר שירות ורופא' : 'Select Service & Doctor'}</CardTitle>
              {selectedPatient && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t('selectService')}</Label>
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
                <Label>{t('selectDoctor')}</Label>
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  {t('back')}
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!selectedService}
                  onClick={() => setStep(3)}
                >
                  {t('next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
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
                                ? "border-green-600 bg-green-50 ring-2 ring-green-600"
                                : "border-gray-200 hover:border-green-300"
                            )}
                          >
                            <p className="font-semibold text-gray-800">
                              {format(new Date(slot.start_time), 'HH:mm')}
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
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  {t('back')}
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!selectedSlot}
                  onClick={() => setStep(4)}
                >
                  {t('next')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && selectedSlot && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{isRTL ? 'אישור התור' : 'Confirm Appointment'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('patient')}</p>
                    <p className="font-medium">{selectedPatient?.first_name} {selectedPatient?.last_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('selectDate')}</p>
                    <p className="font-medium">{format(new Date(selectedSlot.start_time), 'EEEE, dd/MM/yyyy')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('selectTime')}</p>
                    <p className="font-medium">{format(new Date(selectedSlot.start_time), 'HH:mm')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-600" />
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
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  {t('back')}
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
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

export default function SecretaryBooking() {
  return (
    <LanguageProvider>
      <SecretaryBookingContent />
    </LanguageProvider>
  );
}
