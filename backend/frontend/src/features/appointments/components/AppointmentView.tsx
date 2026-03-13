import React, { useEffect, useState } from 'react';
import { fetchInvoiceByAppointmentId } from '../../billing/billing.api';

const AppointmentView = ({ appointmentId }) => {
    const [invoice, setInvoice] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        try {
            const data = await fetchInvoiceByAppointmentId(appointmentId);
            setInvoice(data);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        if (appointmentId) {
            handleGenerate();
        }
    }, [appointmentId]);

    return (
        <div>
            <h1>Appointment Invoice</h1>
            {error && <p>Error: {error}</p>}
            {invoice && (
                <div>
                    <p>Payment Cost: {invoice.paymentCost}</p>
                    <p>Practitioner Name: {invoice.practitionerName}</p>
                    <p>Clinic Name: {invoice.clinicName}</p>
                </div>
            )}
            <button onClick={handleGenerate}>Generate</button>
        </div>
    );
};

export default AppointmentView;