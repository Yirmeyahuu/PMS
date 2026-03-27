import { useCallback } from 'react';
import type { Appointment } from '@/types';

interface BlockTime {
  date: string;
  start_time: string;
  end_time: string;
}

interface ConflictingAppointment {
  appointment: Appointment;
  blockStartTime: string;
  blockEndTime: string;
}

/**
 * Hook to detect conflicts between block appointments and existing appointments
 * 
 * Conflict definition:
 * block_event.start_time < appointment.end_time
 * AND
 * block_event.end_time > appointment.start_time
 */
export const useBlockConflictDetection = (appointments: Appointment[]) => {
  
  /**
   * Check if a block time range overlaps with an appointment
   */
  const checkOverlap = useCallback((
    blockStart: string,
    blockEnd: string,
    appointmentStart: string,
    appointmentEnd: string
  ): boolean => {
    // Convert time strings to comparable format (minutes from midnight)
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const blockStartMins = timeToMinutes(blockStart);
    const blockEndMins = timeToMinutes(blockEnd);
    const aptStartMins = timeToMinutes(appointmentStart);
    const aptEndMins = timeToMinutes(appointmentEnd);
    
    // Conflict: block starts before appointment ends AND block ends after appointment starts
    return blockStartMins < aptEndMins && blockEndMins > aptStartMins;
  }, []);

  /**
   * Find all appointments that conflict with a given block time
   */
  const findConflicts = useCallback((
    blockTime: BlockTime
  ): ConflictingAppointment[] => {
    if (!appointments || appointments.length === 0) {
      return [];
    }

    const conflictingAppointments: ConflictingAppointment[] = [];

    for (const appointment of appointments) {
      // Skip cancelled appointments
      if (appointment.status === 'CANCELLED') {
        continue;
      }

      // Check if dates match
      if (appointment.date !== blockTime.date) {
        continue;
      }

      // Check for overlap
      const hasOverlap = checkOverlap(
        blockTime.start_time,
        blockTime.end_time,
        appointment.start_time,
        appointment.end_time
      );

      if (hasOverlap) {
        conflictingAppointments.push({
          appointment,
          blockStartTime: blockTime.start_time,
          blockEndTime: blockTime.end_time,
        });
      }
    }

    return conflictingAppointments;
  }, [appointments, checkOverlap]);

  /**
   * Check if a block time has any conflicts
   */
  const hasConflict = useCallback((
    blockTime: BlockTime
  ): boolean => {
    return findConflicts(blockTime).length > 0;
  }, [findConflicts]);

  /**
   * Get the first conflict (for simple conflict detection)
   */
  const getFirstConflict = useCallback((
    blockTime: BlockTime
  ): ConflictingAppointment | null => {
    const conflicts = findConflicts(blockTime);
    return conflicts.length > 0 ? conflicts[0] : null;
  }, [findConflicts]);

  return {
    findConflicts,
    hasConflict,
    getFirstConflict,
  };
};