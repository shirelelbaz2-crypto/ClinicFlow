import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import WeekCalendar from '@/components/ui/WeekCalendar';
import FollowUpList from '@/components/secretary/FollowUpList';
import AppointmentTable from '@/components/secretary/AppointmentTable';
import SlotManager from '@/components/secretary/SlotManager';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  Clock, 
  FileText,
  LogOut,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload
} from 'lucide-react';
import { startOfWeek, format, differenceInDays, isSameDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function SecretaryDashboardContent() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date'),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-referral_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.PatientProfile.list(),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => base44.entities.StaffProfile.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list(),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['slots'],
    queryFn: () => base44.entities.AppointmentSlot.list('-start_time'),
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
    }
  });

  const createSlotMutation = useMutation({
    mutationFn: (data) => base44.entities.AppointmentSlot.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['slots']);
    }
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id) => base44.entities.AppointmentSlot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['slots']);
    }
  });

  // Calculate follow-up list (referrals without appointments after 10 days)
  const followUpReferrals = referrals.filter(ref => {
    const refDate = new Date(ref.referral_date);
    if (isNaN(refDate.getTime())) return false;
    const daysSinceReferral = differenceInDays(new Date(), refDate);
    return daysSinceReferral >= 10 && ref.status !== 'APPOINTMENT_SCHEDULED' && ref.status !== 'EXPIRED';
  });

  // Today's appointments
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
    return !isNaN(aptDate.getTime()) && isSameDay(aptDate, new Date()) && apt.status !== 'CANCELLED';
  });

  // Selected date appointments
  const selectedDateAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
    return !isNaN(aptDate.getTime()) && isSameDay(aptDate, selectedDate) && apt.status !== 'CANCELLED';
  }).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

  // Stats
  const pendingCount = appointments.filter(apt => apt.status === 'PENDING').length;
  const confirmedTodayCount = todayAppointments.filter(apt => apt.status === 'CONFIRMED').length;

  const handleMarkAttendance = (appointmentId, attendance) => {
    updateAppointmentMutation.mutate({
      id: appointmentId,
      data: { 
        attendance,
        status: attendance === 'ATTENDED' ? 'COMPLETED' : 'NO_SHOW'
      }
    });
  };

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
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">{t('dashboard')}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('UploadReferral')}>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  {t('uploadReferral')}
                </Button>
              </Link>
              <LanguageSelector variant="minimal" />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('todaysAppointments')}</p>
                  <p className="text-3xl font-bold text-gray-800">{todayAppointments.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('pending')}</p>
                  <p className="text-3xl font-bold text-gray-800">{pendingCount}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('confirmedToday')}</p>
                  <p className="text-3xl font-bold text-gray-800">{confirmedTodayCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('followUpList')}</p>
                  <p className="text-3xl font-bold text-gray-800">{followUpReferrals.length}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Calendar & Tabs */}
          <div className="lg:col-span-2 space-y-6">
            <WeekCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              appointments={appointments}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
            />

            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="bg-white border border-gray-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="appointments" 
                  className="rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('allAppointments')}
                </TabsTrigger>
                <TabsTrigger 
                  value="slots"
                  className="rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t('manageSlots')}
                </TabsTrigger>
                <TabsTrigger 
                  value="followup"
                  className="rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('followUpList')}
                  {followUpReferrals.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {followUpReferrals.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appointments" className="mt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h3>
                </div>
                {loadingAppointments ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : (
                  <AppointmentTable
                    appointments={selectedDateAppointments}
                    patients={patients}
                    doctors={doctors}
                    services={services}
                    onMarkAttendance={handleMarkAttendance}
                  />
                )}
              </TabsContent>

              <TabsContent value="slots" className="mt-6">
                <SlotManager
                  slots={slots}
                  doctors={doctors}
                  sites={sites}
                  services={services}
                  selectedDate={selectedDate}
                  onCreateSlot={(data) => createSlotMutation.mutate(data)}
                  onDeleteSlot={(id) => deleteSlotMutation.mutate(id)}
                />
              </TabsContent>

              <TabsContent value="followup" className="mt-6">
                <FollowUpList
                  referrals={followUpReferrals}
                  patients={patients}
                  services={services}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Quick Info */}
          <div className="space-y-6">
            {/* Today's Schedule Summary */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('todaysSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todayAppointments.slice(0, 5).map((apt) => {
                    const patient = patients.find(p => p.id === apt.patient_id);
                    const aptDate = new Date(apt.appointment_date);
                    return (
                      <div key={apt.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {!isNaN(aptDate.getTime()) ? format(aptDate, 'HH:mm') : '-'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {patient?.first_name} {patient?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{patient?.national_id}</p>
                        </div>
                      </div>
                    );
                  })}
                  {todayAppointments.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      {t('noAppointmentsToday')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('quickActions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to={createPageUrl('SecretaryBooking')}>
                  <Button className="w-full bg-green-600 hover:bg-green-700 justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('bookAppointment')}
                  </Button>
                </Link>
                <Link to={createPageUrl('UploadReferral')}>
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    {t('uploadReferral')}
                  </Button>
                </Link>
                <Link to={createPageUrl('ManagePatients')}>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    {t('managePatients')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SecretaryDashboard() {
  return (
    <LanguageProvider>
      <SecretaryDashboardContent />
    </LanguageProvider>
  );
}
