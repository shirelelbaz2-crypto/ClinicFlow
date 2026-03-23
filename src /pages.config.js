import AvailabilityAlerts from './pages/AvailabilityAlerts';
import BookAppointment from './pages/BookAppointment';
import Home from './pages/Home';
import ManagePatients from './pages/ManagePatients';
import PatientDashboard from './pages/PatientDashboard';
import SecretaryBooking from './pages/SecretaryBooking';
import SecretaryDashboard from './pages/SecretaryDashboard';
import UploadReferral from './pages/UploadReferral';


export const PAGES = {
    "AvailabilityAlerts": AvailabilityAlerts,
    "BookAppointment": BookAppointment,
    "Home": Home,
    "ManagePatients": ManagePatients,
    "PatientDashboard": PatientDashboard,
    "SecretaryBooking": SecretaryBooking,
    "SecretaryDashboard": SecretaryDashboard,
    "UploadReferral": UploadReferral,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};
