import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DateInput from "@/components/ui/DateInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  ArrowRight,
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Edit,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

function ManagePatientsContent() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    national_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    pregnancy_start_date: '',
    preferred_language: 'he',
    notes: ''
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.PatientProfile.list('-created_date'),
  });

  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(search) ||
      p.last_name?.toLowerCase().includes(search) ||
      p.national_id?.includes(search) ||
      p.email?.toLowerCase().includes(search)
    );
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PatientProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['patients']);
      setShowCreateDialog(false);
      resetForm();
      toast.success(isRTL ? 'המטופל נוסף בהצלחה' : 'Patient added successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PatientProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['patients']);
      setEditingPatient(null);
      resetForm();
      toast.success(isRTL ? 'הפרטים עודכנו' : 'Details updated');
    }
  });

  const resetForm = () => {
    setFormData({
      national_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      pregnancy_start_date: '',
      preferred_language: 'he',
      notes: ''
    });
    setValidationErrors({});
  };

  const handleEdit = (patient) => {
    setFormData({
      national_id: patient.national_id || '',
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      date_of_birth: patient.date_of_birth || '',
      pregnancy_start_date: patient.pregnancy_start_date || '',
      preferred_language: patient.preferred_language || 'he',
      notes: patient.notes || ''
    });
    setEditingPatient(patient);
  };

  const [validationErrors, setValidationErrors] = useState({});

  const handleSubmit = () => {
    const errors = {};
    
    if (!formData.national_id) errors.national_id = true;
    if (!formData.first_name) errors.first_name = true;
    if (!formData.last_name) errors.last_name = true;
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error(t('fillAllRequired'));
      return;
    }
    
    setValidationErrors({});

    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('SecretaryDashboard')}>
                <Button variant="ghost" size="icon">
                  <BackIcon className="h-5 w-5" />
                </Button>
              </Link>
              <span className="text-xl font-bold text-gray-800">
                {t('managePatients')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => setShowCreateDialog(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                {t('addPatient')}
              </Button>
              <LanguageSelector variant="minimal" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('searchByNameOrId')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('noPatientsFound')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('id')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('language')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{patient.national_id}</TableCell>
                      <TableCell>
                        {patient.phone && (
                          <a href={`tel:${patient.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                            <Phone className="h-4 w-4" />
                            {patient.phone}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${patient.email}`} className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                          <Mail className="h-4 w-4" />
                          {patient.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        {{
                          'he': '🇮🇱 עברית',
                          'ar': '🇵🇸 العربية',
                          'en': '🇬🇧 English',
                          'ru': '🇷🇺 Русский'
                        }[patient.preferred_language] || patient.preferred_language}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(patient)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingPatient} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingPatient(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPatient 
                ? t('editPatient')
                : t('addNewPatient')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('firstName')} *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className={validationErrors.first_name ? 'border-red-500 focus:ring-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('lastName')} *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className={validationErrors.last_name ? 'border-red-500 focus:ring-red-500' : ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('nationalId')} *</Label>
              <Input
                value={formData.national_id}
                onChange={(e) => setFormData({...formData, national_id: e.target.value})}
                maxLength={9}
                className={validationErrors.national_id ? 'border-red-500 focus:ring-red-500' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <DateInput
              label={t('dateOfBirth')}
              value={formData.date_of_birth}
              onChange={(val) => setFormData({...formData, date_of_birth: val})}
            />

            <DateInput
              label={t('pregnancyStartDate')}
              value={formData.pregnancy_start_date}
              onChange={(val) => setFormData({...formData, pregnancy_start_date: val})}
            />

            <div className="space-y-2">
              <Label>{t('preferredLanguage')}</Label>
              <Select 
                value={formData.preferred_language} 
                onValueChange={(val) => setFormData({...formData, preferred_language: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">🇮🇱 עברית</SelectItem>
                  <SelectItem value="ar">🇵🇸 العربية</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingPatient(null);
              resetForm();
            }}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                t('save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ManagePatients() {
  return (
    <LanguageProvider>
      <ManagePatientsContent />
    </LanguageProvider>
  );
}
