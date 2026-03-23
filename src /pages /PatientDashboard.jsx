import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import WeekCalendar from '@/components/ui/WeekCalendar';
import PregnancyTracker from '@/components/patient/PregnancyTracker';
import ReferralCard from '@/components/patient/ReferralCard';
import AppointmentCard from '@/components/patient/AppointmentCard';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  FileText, 
  Bell, 
  LogOut,
  Plus,
  Loader2
} from 'lucide-react';
import { startOfWeek, addDays, isAfter, isBefore } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function PatientDashboardContent() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [currentUser, setCurrentUser] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);

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

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', patientProfile?.id],
    queryFn: () => base44.entities.Appointment.filter({ patient_id: patientProfile.id }),
    enabled: !!patientProfile?.id,
  });

  const { data: referrals = [], isLoading: loadingReferrals } = useQuery({
    queryKey: ['referrals', patientProfile?.id],
    queryFn: () => base44.entities.Referral.filter({ patient_id: patientProfile.id }),
    enabled: !!patientProfile?.id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const cancelMutation = useMutation({
    mutationFn: (appointment) => base44.entities.Appointment.update(appointment.id, {
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
    }
  });

  const upcomingAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return apt.status !== 'CANCELLED' && !isNaN(aptDate.getTime()) && isAfter(aptDate, new Date());
    })
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

  const activeReferrals = referrals.filter(ref => {
    if (ref.status === 'EXPIRED') return false;
    if (!ref.expiry_date) return true;
    const expDate = new Date(ref.expiry_date);
    return !isNaN(expDate.getTime()) && isAfter(expDate, new Date());
  });

  const pendingReferrals = activeReferrals.filter(ref => ref.status !== 'APPOINTMENT_SCHEDULED');

  const getService = (serviceId) => services.find(s => s.id === serviceId);
  const getDoctor = (doctorId) => doctors.find(d => d.id === doctorId);
  const getSite = (siteId) => sites.find(s => s.id === siteId);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">{t('appName')}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <LanguageSelector variant="minimal" />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isRTL ? 'שלום' : 'Hello'}, {patientProfile?.first_name || currentUser?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500">
            {isRTL ? 'ברוכה הבאה למערכת ניהול התורים' : 'Welcome to your appointment dashboard'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar */}
            <WeekCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              appointments={appointments}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
            />

            {/* Tabs */}
            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="bg-white border border-gray-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="appointments" 
                  className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('myAppointments')}
                </TabsTrigger>
                <TabsTrigger 
                  value="referrals"
                  className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t('myReferrals')}
                  {pendingReferrals.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingReferrals.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appointments" className="mt-6">
                {loadingAppointments ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : upcomingAppointments.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">{t('noAppointments')}</p>
                    {pendingReferrals.length > 0 && (
                      <Link to={createPageUrl('BookAppointment') + `?referral_id=${pendingReferrals[0].id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('bookAppointment')}
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {upcomingAppointments.map((apt) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        doctor={getDoctor(apt.doctor_id)}
                        site={getSite(apt.site_id)}
                        service={getService(apt.service_id)}
                        onCancel={(apt) => cancelMutation.mutate(apt)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="referrals" className="mt-6">
                {loadingReferrals ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : activeReferrals.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">{isRTL ? 'אין הפניות פעילות' : 'No active referrals'}</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeReferrals.map((referral) => (
                      <ReferralCard
                        key={referral.id}
                        referral={referral}
                        service={getService(referral.service_id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Pregnancy Tracker */}
            {patientProfile?.pregnancy_start_date && (
              <PregnancyTracker pregnancyStartDate={patientProfile.pregnancy_start_date} />
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                {t('quickActions')}
              </h3>
              <div className="space-y-3">
                {pendingReferrals.length > 0 && (
                  <Link to={createPageUrl('BookAppointment') + `?referral_id=${pendingReferrals[0].id}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('bookAppointment')}
                    </Button>
                  </Link>
                )}
                <Link to={createPageUrl('AvailabilityAlerts')}>
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    {t('availabilityAlert')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Pending Referrals Alert */}
            {pendingReferrals.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {isRTL ? 'הפניות ממתינות' : 'Pending Referrals'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {pendingReferrals.length} {isRTL ? 'הפניות לקביעת תור' : 'referrals to schedule'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PatientDashboard() {
  return (
    <LanguageProvider>
      <PatientDashboardContent />
    </LanguageProvider>
  );
}
