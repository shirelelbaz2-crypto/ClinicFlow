import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Lock, 
  Mail, 
  User,
  Loader2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function HomeContent() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          // Check user type and redirect
          const user = await base44.auth.me();
          
          // Check if user is staff (secretary/doctor)
          const staff = await base44.entities.StaffProfile.filter({ user_id: user.id });
          if (staff.length > 0) {
            navigate(createPageUrl('SecretaryDashboard'));
            return;
          }
          
          // Check if user is patient
          const patients = await base44.entities.PatientProfile.filter({ user_id: user.id });
          if (patients.length > 0) {
            navigate(createPageUrl('PatientDashboard'));
            return;
          }

          // Check by email
          const patientByEmail = await base44.entities.PatientProfile.filter({ email: user.email });
          if (patientByEmail.length > 0) {
            navigate(createPageUrl('PatientDashboard'));
            return;
          }

          const staffByEmail = await base44.entities.StaffProfile.filter({ email: user.email });
          if (staffByEmail.length > 0) {
            navigate(createPageUrl('SecretaryDashboard'));
            return;
          }

          // Default to patient dashboard
          navigate(createPageUrl('PatientDashboard'));
        }
      } catch (e) {
        console.log('Not authenticated');
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200 rounded-full opacity-20 blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{t('appName')}</h1>
              <p className="text-xs text-gray-500">
                {isRTL ? 'מערכת ניהול תורים' : 'Appointment System'}
              </p>
            </div>
          </div>
          <LanguageSelector />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Card className="border-0 shadow-2xl shadow-blue-100/50 bg-white/80 backdrop-blur-xl">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold text-gray-800">
                  {isRTL ? 'ברוכים הבאים' : 'Welcome'}
                </CardTitle>
                <CardDescription>
                  {isRTL 
                    ? 'התחבר כדי לנהל את התורים שלך'
                    : 'Sign in to manage your appointments'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6">
                <Button 
                  onClick={handleLogin}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:-translate-y-0.5"
                >
                  {t('login')}
                  <ArrowIcon className="h-5 w-5 ml-2" />
                </Button>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-center text-sm text-gray-500">
                    {isRTL 
                      ? 'אין לך חשבון? פנה למזכירות הקליניקה'
                      : "Don't have an account? Contact the clinic secretary"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600">
                  {isRTL ? 'קביעת תורים' : 'Book Appointments'}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">
                  {isRTL ? 'מעקב אישי' : 'Personal Tracking'}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-xs text-gray-600">
                  {isRTL ? 'תזכורות' : 'Reminders'}
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} {t('appName')}
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}
