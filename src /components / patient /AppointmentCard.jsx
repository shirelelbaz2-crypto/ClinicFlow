import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Bell,
  X,
  AlertTriangle
} from 'lucide-react';
import { format, differenceInDays, isAfter } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AppointmentCard({ 
  appointment, 
  doctor, 
  site, 
  service,
  onCancel,
  onReschedule
}) {
  const { t, isRTL } = useLanguage();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleWarning, setShowRescheduleWarning] = useState(false);
  
  const appointmentDate = new Date(appointment.appointment_date);
  if (isNaN(appointmentDate.getTime())) {
    return null;
  }
  
  const daysUntil = differenceInDays(appointmentDate, new Date());
  const canModify = daysUntil >= 7;
  const isPast = isAfter(new Date(), appointmentDate);
  
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    CHECKED_IN: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-orange-100 text-orange-700'
  };

  const handleRescheduleClick = () => {
    if (!canModify) {
      setShowRescheduleWarning(true);
    } else {
      onReschedule?.(appointment);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
              {format(appointmentDate, 'd')}
            </div>
            <div>
              <p className="text-sm text-gray-500">{format(appointmentDate, 'EEEE')}</p>
              <p className="font-semibold text-gray-800">{format(appointmentDate, 'MMMM yyyy')}</p>
            </div>
          </div>
          <Badge className={statusColors[appointment.status]}>
            {t(appointment.status.toLowerCase())}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{format(appointmentDate, 'HH:mm')}</span>
          </div>
          
          {doctor && (
            <div className="flex items-center gap-3 text-gray-600">
              <User className="h-4 w-4 text-gray-400" />
              <span>{doctor.first_name} {doctor.last_name}</span>
            </div>
          )}
          
          {site && (
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{site.name}</span>
            </div>
          )}
          
          {service && (
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{service.name}</span>
            </div>
          )}
        </div>

        {!isPast && appointment.status !== 'CANCELLED' && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleRescheduleClick}
            >
              {t('edit')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!canModify && !isPast && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {isRTL ? `${daysUntil} ימים לתור` : `${daysUntil} days until appointment`}
          </p>
        )}
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'ביטול תור' : 'Cancel Appointment'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'האם אתה בטוח שברצונך לבטל את התור?' 
                : 'Are you sure you want to cancel this appointment?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {t('cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onCancel?.(appointment);
                setShowCancelDialog(false);
              }}
            >
              {isRTL ? 'בטל תור' : 'Cancel Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRescheduleWarning} onOpenChange={setShowRescheduleWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {isRTL ? 'לא ניתן לשנות' : 'Cannot Reschedule'}
            </DialogTitle>
            <DialogDescription>
              {t('cannotReschedule')}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {isRTL ? 'למזכירות:' : 'Secretary:'} <a href="tel:08-652714" className="underline font-bold">08-652714</a>
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowRescheduleWarning(false)}>
              {isRTL ? 'הבנתי' : 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
