import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/invoices/by_appointment/';

export const fetchInvoiceByAppointment = async (appointmentId) => {
    try {
        const response = await axios.get(`${API_URL}${appointmentId}/`);
        return response.data;
    } catch (error) {
        throw new Error('Error fetching invoice: ' + error.message);
    }
};