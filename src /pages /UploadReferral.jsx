import React, { useState } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  ArrowRight,
  Upload,
  FileText,
  CheckCircle,
  Loader2,
  Search,
  User
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

function UploadReferralContent() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [referralData, setReferralData] = useState({
    service_id: '',
    referring_doctor: '',
    referral_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    notes: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.PatientProfile.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list(),
  });

  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(search) ||
      p.last_name?.toLowerCase().includes(search) ||
      p.national_id?.includes(search)
    );
  });

  const createReferralMutation = useMutation({
    mutationFn: async (data) => {
      let fileUrl = null;
      
      if (file) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file });
        fileUrl = result.file_url;
        setUploading(false);
      }

      return base44.entities.Referral.create({
        ...data,
        file_url: fileUrl,
        status: 'NEW'
      });
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries(['referrals']);
      toast.success(isRTL ? 'ההפניה נוספה בהצלחה' : 'Referral added successfully');
    }
  });

  const handleSubmit = () => {
    if (!selectedPatient || !referralData.service_id) {
      toast.error(isRTL ? 'נא למלא את כל השדות הנדרשים' : 'Please fill all required fields');
      return;
    }

    createReferralMutation.mutate({
      patient_id: selectedPatient.id,
      ...referralData
    });
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-0 shadow-lg">
          <CardContent className="pt-12 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t('referralAddedSuccess')}
            </h2>
            <p className="text-gray-500 mb-6">
              {t('patientWillBeNotified')}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setSuccess(false);
                  setSelectedPatient(null);
                  setReferralData({
                    service_id: '',
                    referring_doctor: '',
                    referral_date: format(new Date(), 'yyyy-MM-dd'),
                    expiry_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
                    notes: ''
                  });
                  setFile(null);
                }}
              >
                {t('addAnother')}
              </Button>
              <Link to={createPageUrl('SecretaryDashboard')} className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  {t('dashboard')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('SecretaryDashboard')}>
                <Button variant="ghost" size="icon">
                  <BackIcon className="h-5 w-5" />
                </Button>
              </Link>
              <span className="text-xl font-bold text-gray-800">{t('uploadReferral')}</span>
            </div>
            <LanguageSelector variant="minimal" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('addNewReferral')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patient Search */}
            <div className="space-y-3">
              <Label>{t('selectPatient')}</Label>
              
              {!selectedPatient ? (
                <>
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
                    <div className="border rounded-xl max-h-48 overflow-y-auto">
                      {filteredPatients.length === 0 ? (
                        <p className="p-4 text-center text-gray-500">
                          {t('noPatientsFound')}
                        </p>
                      ) : (
                        filteredPatients.map((patient) => (
                          <button
                            key={patient.id}
                            onClick={() => setSelectedPatient(patient)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b last:border-0"
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
                </>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                      <p className="text-sm text-gray-500">{selectedPatient.national_id}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                  >
                    {t('change')}
                  </Button>
                </div>
              )}
            </div>

            {/* Service */}
            <div className="space-y-2">
              <Label>{t('selectService')}</Label>
              <Select 
                value={referralData.service_id} 
                onValueChange={(val) => setReferralData({...referralData, service_id: val})}
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

            {/* Referring Doctor */}
            <div className="space-y-2">
              <Label>{t('referringDoctor')}</Label>
              <Input
                value={referralData.referring_doctor}
                onChange={(e) => setReferralData({...referralData, referring_doctor: e.target.value})}
                placeholder={t('nameOfReferringDoctor')}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('referralDate')}</Label>
                <Input
                  type="date"
                  value={referralData.referral_date}
                  onChange={(e) => setReferralData({...referralData, referral_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('validUntil')}</Label>
                <Input
                  type="date"
                  value={referralData.expiry_date}
                  onChange={(e) => setReferralData({...referralData, expiry_date: e.target.value})}
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{t('attachReferralFile')}</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-red-500"
                        onClick={() => setFile(null)}
                        >
                        {t('remove')}
                        </Button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {t('clickToUpload')}
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Textarea
                value={referralData.notes}
                onChange={(e) => setReferralData({...referralData, notes: e.target.value})}
                placeholder={t('additionalNotes')}
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button 
              className="w-full h-12 bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={!selectedPatient || !referralData.service_id || createReferralMutation.isPending || uploading}
            >
              {(createReferralMutation.isPending || uploading) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  {t('saveReferral')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function UploadReferral() {
  return (
    <LanguageProvider>
      <UploadReferralContent />
    </LanguageProvider>
  );
}
