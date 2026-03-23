import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, Calendar } from 'lucide-react';
import { format, addMinutes, parse } from 'date-fns';

export default function SlotManager({ 
  slots, 
  doctors, 
  sites, 
  services,
  selectedDate,
  onCreateSlot,
  onDeleteSlot 
}) {
  const { t, isRTL } = useLanguage();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [newSlot, setNewSlot] = useState({
    doctor_id: '',
    site_id: '',
    service_id: '',
    start_time: '09:00',
    duration: 30
  });
  const [bulkSlot, setBulkSlot] = useState({
    doctor_id: '',
    site_id: '',
    service_id: '',
    start_time: '08:00',
    end_time: '14:00'
  });

  const handleCreateSlot = () => {
    if (!newSlot.doctor_id || !newSlot.site_id || !newSlot.service_id || !selectedDate) return;

    const startDateTime = parse(
      `${format(selectedDate, 'yyyy-MM-dd')} ${newSlot.start_time}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );
    const endDateTime = addMinutes(startDateTime, newSlot.duration);

    onCreateSlot?.({
      doctor_id: newSlot.doctor_id,
      site_id: newSlot.site_id,
      service_id: newSlot.service_id,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status: 'OPEN',
      capacity: 1,
      booked_count: 0
    });

    setShowCreateDialog(false);
    setNewSlot({
      doctor_id: '',
      site_id: '',
      service_id: '',
      start_time: '09:00',
      duration: 30
    });
  };

  const handleBulkCreate = async () => {
    if (!bulkSlot.doctor_id || !bulkSlot.site_id || !bulkSlot.service_id) {
      return;
    }

    const [startHours, startMinutes] = bulkSlot.start_time.split(':').map(Number);
    const [endHours, endMinutes] = bulkSlot.end_time.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    if (startTotalMinutes >= endTotalMinutes) {
      return;
    }

    let currentMinutes = startTotalMinutes;
    
    while (currentMinutes < endTotalMinutes) {
      const startDateTime = parse(
        `${format(selectedDate, 'yyyy-MM-dd')} ${Math.floor(currentMinutes / 60)}:${String(currentMinutes % 60).padStart(2, '0')}`,
        'yyyy-MM-dd H:mm',
        new Date()
      );
      const endDateTime = addMinutes(startDateTime, 5);
      
      await onCreateSlot?.({
        doctor_id: bulkSlot.doctor_id,
        site_id: bulkSlot.site_id,
        service_id: bulkSlot.service_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'OPEN',
        capacity: 1,
        booked_count: 0
      });
      
      currentMinutes += 5;
    }

    setShowBulkDialog(false);
    setBulkSlot({
      doctor_id: '',
      site_id: '',
      service_id: '',
      start_time: '08:00',
      end_time: '14:00'
    });
  };

  const getDoctor = (doctorId) => doctors?.find(d => d.id === doctorId);
  const getSite = (siteId) => sites?.find(s => s.id === siteId);
  const getService = (serviceId) => services?.find(s => s.id === serviceId);

  const statusColors = {
    OPEN: 'bg-green-100 text-green-700 border-green-200',
    HELD: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    BOOKED: 'bg-blue-100 text-blue-700 border-blue-200',
    BLOCKED: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const filteredSlots = slots?.filter(slot => {
    const slotDate = format(new Date(slot.start_time), 'yyyy-MM-dd');
    const selected = format(selectedDate, 'yyyy-MM-dd');
    return slotDate === selected;
  }) || [];

  const sortedSlots = [...filteredSlots].sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => setShowBulkDialog(true)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <Plus className="h-4 w-4 mr-2" />
            {isRTL ? 'יצירה המונית' : 'Bulk Create'}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            {t('addSlot')}
          </Button>
        </div>
      </div>

      {sortedSlots.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('noSlotsForDay')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSlots.map((slot) => {
            const doctor = getDoctor(slot.doctor_id);
            const site = getSite(slot.site_id);
            const service = getService(slot.service_id);
            
            return (
              <div 
                key={slot.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {format(new Date(slot.start_time), 'HH:mm')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {doctor?.first_name} {doctor?.last_name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{service?.name}</span>
                      <span>•</span>
                      <span>{site?.name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[slot.status]}>
                    {slot.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {format(new Date(slot.start_time), 'HH:mm')} - {format(new Date(slot.end_time), 'HH:mm')}
                  </span>
                  {slot.status === 'OPEN' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => onDeleteSlot?.(slot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'הוספת משבצת חדשה' : 'Add New Slot'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('selectDoctor')}</Label>
              <Select 
                value={newSlot.doctor_id} 
                onValueChange={(val) => setNewSlot({...newSlot, doctor_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectDoctor')} />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.filter(d => d.staff_type === 'DOCTOR').map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('site')}</Label>
              <Select 
                value={newSlot.site_id} 
                onValueChange={(val) => setNewSlot({...newSlot, site_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSite')} />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('selectService')}</Label>
              <Select 
                value={newSlot.service_id} 
                onValueChange={(val) => setNewSlot({...newSlot, service_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectService')} />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('startTime')}</Label>
                <Input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('durationMin')}</Label>
                <Select 
                  value={String(newSlot.duration)} 
                  onValueChange={(val) => setNewSlot({...newSlot, duration: parseInt(val)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="45">45</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateSlot} className="bg-blue-600 hover:bg-blue-700">
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'יצירת משבצות המונית (5 דקות)' : 'Bulk Create Slots (5 min intervals)'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('selectDoctor')}</Label>
              <Select 
                value={bulkSlot.doctor_id} 
                onValueChange={(val) => setBulkSlot({...bulkSlot, doctor_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectDoctor')} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('selectSite')}</Label>
              <Select 
                value={bulkSlot.site_id} 
                onValueChange={(val) => setBulkSlot({...bulkSlot, site_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSite')} />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('selectService')}</Label>
              <Select 
                value={bulkSlot.service_id} 
                onValueChange={(val) => setBulkSlot({...bulkSlot, service_id: val})}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('from')}</Label>
                <Input
                  type="time"
                  value={bulkSlot.start_time}
                  onChange={(e) => setBulkSlot({...bulkSlot, start_time: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('until')}</Label>
                <Input
                  type="time"
                  value={bulkSlot.end_time}
                  onChange={(e) => setBulkSlot({...bulkSlot, end_time: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {isRTL 
                  ? 'המערכת תיצור משבצות של 5 דקות בטווח הזמן שנבחר'
                  : 'System will create 5-minute slots for the selected time range'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleBulkCreate} className="bg-green-600 hover:bg-green-700">
              {isRTL ? 'צור משבצות' : 'Create Slots'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
