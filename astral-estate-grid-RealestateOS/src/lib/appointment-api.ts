import type { Appointment } from "./dashboard-data";

/**
 * Backend-ready placeholders for appointment workflows.
 *
 * Later connect these to Supabase appointments and leads tables.
 */

export async function fetchAppointments(): Promise<Appointment[]> {
  // TODO: replace with real fetch from Supabase/Postgres or an API route.
  return [];
}

export async function createAppointment(input: Appointment): Promise<Appointment> {
  // TODO: replace with insert into appointments table.
  void input;
  return input;
}

export async function updateAppointment(propertyId: string, data: Partial<Appointment>): Promise<void> {
  // TODO: replace with update query in Supabase/Postgres.
  void propertyId;
  void data;
}

export async function linkAppointmentToLead(appointmentId: string, leadId: string): Promise<void> {
  // TODO: replace with relation write between appointments and leads tables.
  void appointmentId;
  void leadId;
}

