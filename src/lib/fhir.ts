const FHIR_SERVER_URL = process.env.NEXT_PUBLIC_FHIR_SERVER_URL || 'https://hapi.fhir.org/baseR4';

export const fetchPatient = async (patientId: string) => {
  const response = await fetch(`${FHIR_SERVER_URL}/Patient/${patientId}`, {
    headers: { Accept: 'application/fhir+json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch patient: ${response.status} ${response.statusText}`);
  }
  return response.json();
};
