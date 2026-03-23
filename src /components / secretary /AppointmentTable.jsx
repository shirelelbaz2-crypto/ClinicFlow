import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, User, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function AppointmentTable({ 
  appointments, 
  patients, 
  doctors, 
  services,
  onMarkAttendance 
}) {
  const { t, isRTL } = useLanguage();

  const getPatient = (patientId) => patients?.find(p => p.id === patientId);
  const getDoctor = (doctorId) => doctors?.find(d => d.id === doctorId);
  const getService = (serviceId) => services?.find(s => s.id === serviceId);

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    CHECKED_IN: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-orange-100 text-orange-700'
  };

  const attendanceColors = {
    ATTENDED: 'text-green-600',
    NOT_ATTENDED: 'text-red-600',
    UNKNOWN: 'text-gray-400'
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('noAppointments')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>{isRTL ? 'שעה' : 'Time'}</TableHead>
            <TableHead>{isRTL ? 'מטופל' : 'Patient'}</TableHead>
            <TableHead>{isRTL ? 'שירות' : 'Service'}</TableHead>
            <TableHead>{isRTL ? 'רופא' : 'Doctor'}</TableHead>
            <TableHead>{isRTL ? 'סטטוס' : 'Status'}</TableHead>
            <TableHead>{isRTL ? 'נוכחות' : 'Attendance'}</TableHead>
            <TableHead>{isRTL ? 'פעולות' : 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((apt) => {
            const patient = getPatient(apt.patient_id);
            const doctor = getDoctor(apt.doctor_id);
            const service = getService(apt.service_id);
            
            return (
              <TableRow key={apt.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  {(() => {
                    const aptDate = new Date(apt.appointment_date);
                    return !isNaN(aptDate.getTime()) ? format(aptDate, 'HH:mm') : '-';
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{patient?.first_name} {patient?.last_name}</p>
                      <p className="text-xs text-gray-500">{patient?.national_id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{service?.name}</TableCell>
                <TableCell>
                  {doctor?.first_name} {doctor?.last_name}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[apt.status]}>
                    {t(apt.status.toLowerCase())}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={attendanceColors[apt.attendance]}>
                    {apt.attendance === 'ATTENDED' && <CheckCircle className="h-5 w-5" />}
                    {apt.attendance === 'NOT_ATTENDED' && <XCircle className="h-5 w-5" />}
                    {apt.attendance === 'UNKNOWN' && <Clock className="h-5 w-5" />}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:bg-green-50"
                      onClick={() => onMarkAttendance?.(apt.id, 'ATTENDED')}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                      onClick={() => onMarkAttendance?.(apt.id, 'NOT_ATTENDED')}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    {patient?.phone && (
                      <a href={`tel:${patient.phone}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
