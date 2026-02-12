import type { GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { addEntry, type ApiLogEntry } from './apiLog';

const FHIR_SERVER_URL = process.env.NEXT_PUBLIC_FHIR_SERVER_URL || 'https://fhir-bootcamp.medblocks.com/fhir';

// FHIR Patient resource types
export interface FhirHumanName {
  use?: string;
  family?: string;
  given?: string[];
  text?: string;
}

export interface FhirContactPoint {
  system?: string;
  value?: string;
  use?: string;
}

export interface FhirPatientResource {
  resourceType: 'Patient';
  id?: string;
  name?: FhirHumanName[];
  gender?: string;
  birthDate?: string;
  telecom?: FhirContactPoint[];
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: { resource: FhirPatientResource }[];
}

// Flattened Patient interface used by the UI
export interface Patient {
  id: string;
  name: string;
  family: string;
  given: string;
  gender: string;
  birthDate: string;
  phone: string;
}

// Helper: convert FHIR Patient resource to flat UI Patient
function fhirToPatient(resource: FhirPatientResource): Patient {
  const officialName = resource.name?.find((n) => n.use === 'official') ?? resource.name?.[0];
  const family = officialName?.family ?? '';
  const given = officialName?.given?.join(' ') ?? '';
  const displayName = officialName?.text ?? ([given, family].filter(Boolean).join(' ') || 'Unknown');

  const phone = resource.telecom?.find((t) => t.system === 'phone')?.value ?? '';

  return {
    id: resource.id ?? '',
    name: displayName,
    family,
    given,
    gender: resource.gender ?? '',
    birthDate: resource.birthDate ?? '',
    phone,
  };
}

// Helper: convert flat UI Patient to FHIR Patient resource
function patientToFhir(patient: Partial<Omit<Patient, 'id'>>): Partial<FhirPatientResource> {
  const resource: Partial<FhirPatientResource> = {
    resourceType: 'Patient',
  };

  if (patient.family !== undefined || patient.given !== undefined) {
    resource.name = [
      {
        use: 'official',
        family: patient.family ?? '',
        given: patient.given ? patient.given.split(' ').filter(Boolean) : [],
      },
    ];
  }

  if (patient.gender !== undefined) {
    resource.gender = patient.gender;
  }

  if (patient.birthDate !== undefined) {
    resource.birthDate = patient.birthDate;
  }

  if (patient.phone !== undefined) {
    resource.telecom = [
      {
        system: 'phone',
        value: patient.phone,
        use: 'mobile',
      },
    ];
  }

  return resource;
}

// Logged fetch wrapper — records every API call to the monitoring log
async function loggedFetch(
  url: string,
  options: RequestInit,
  operation: string,
): Promise<Response> {
  const method = (options.method ?? 'GET') as ApiLogEntry['method'];
  const startTime = performance.now();

  const response = await fetch(url, options);

  const duration = Math.round(performance.now() - startTime);

  addEntry({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    method,
    url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    duration,
    operation,
  });

  return response;
}

// Map DataGrid field names to FHIR search parameters
const FIELD_TO_FHIR_PARAM: Record<string, string> = {
  name: 'name',
  family: 'family',
  given: 'given',
  phone: 'telecom',
  gender: 'gender',
  birthDate: 'birthdate',
};

// Map DataGrid field names to FHIR _sort parameter values
const FIELD_TO_FHIR_SORT: Record<string, string> = {
  name: 'name',
  family: 'family',
  given: 'given',
  gender: 'gender',
  birthDate: 'birthdate',
  phone: 'telecom',
};

export async function getMany({
  paginationModel,
  sortModel,
  filterModel,
  quickSearch,
}: {
  paginationModel: GridPaginationModel;
  sortModel: GridSortModel;
  filterModel: GridFilterModel;
  quickSearch?: string;
}): Promise<{ items: Patient[]; itemCount: number }> {
  const offset = paginationModel.page * paginationModel.pageSize;
  const count = paginationModel.pageSize;

  const params = new URLSearchParams({
    _count: String(count),
    _offset: String(offset),
    _total: 'accurate',
  });

  // Apply sorting via FHIR _sort parameter
  // FHIR uses _sort=field for ascending, _sort=-field for descending
  if (sortModel?.length) {
    const sortParts = sortModel
      .map(({ field, sort }) => {
        const fhirField = FIELD_TO_FHIR_SORT[field];
        if (!fhirField) return null;
        return sort === 'desc' ? `-${fhirField}` : fhirField;
      })
      .filter(Boolean);

    if (sortParts.length) {
      params.set('_sort', sortParts.join(','));
    }
  }

  // Apply quick search (searches by name OR phone with partial match)
  if (quickSearch && quickSearch.trim()) {
    const term = quickSearch.trim();
    // Use FHIR name parameter for partial name search
    // and telecom for phone search. We search by name by default,
    // but if the term looks like a phone number, search by telecom too.
    const looksLikePhone = /^[\d\s\-+()]+$/.test(term);
    if (looksLikePhone) {
      params.set('telecom', term);
    } else {
      params.set('name', term);
    }
  }

  // Apply column filters from the DataGrid filter panel
  if (filterModel?.items?.length) {
    for (const { field, value } of filterModel.items) {
      if (!field || !value) continue;

      const fhirParam = FIELD_TO_FHIR_PARAM[field];
      if (fhirParam) {
        params.set(fhirParam, String(value));
      }
    }
  }

  const url = `${FHIR_SERVER_URL}/Patient?${params.toString()}`;

  const response = await loggedFetch(
    url,
    { headers: { Accept: 'application/fhir+json' } },
    quickSearch ? `Search Patients ("${quickSearch}")` : 'List Patients',
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch patients: ${response.status} ${response.statusText}`);
  }

  const bundle: FhirBundle = await response.json();

  const items = (bundle.entry ?? []).map((entry) => fhirToPatient(entry.resource));
  const itemCount = bundle.total ?? items.length;

  return { items, itemCount };
}

export async function getOne(patientId: string): Promise<Patient> {
  const url = `${FHIR_SERVER_URL}/Patient/${patientId}`;

  const response = await loggedFetch(
    url,
    { headers: { Accept: 'application/fhir+json' } },
    'Get Patient',
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch patient: ${response.status} ${response.statusText}`);
  }

  const resource: FhirPatientResource = await response.json();
  return fhirToPatient(resource);
}

export async function createOne(data: Omit<Patient, 'id' | 'name'>): Promise<Patient> {
  const fhirResource = patientToFhir(data);

  const response = await loggedFetch(
    `${FHIR_SERVER_URL}/Patient`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
      body: JSON.stringify(fhirResource),
    },
    'Create Patient',
  );

  if (!response.ok) {
    throw new Error(`Failed to create patient: ${response.status} ${response.statusText}`);
  }

  const created: FhirPatientResource = await response.json();
  return fhirToPatient(created);
}

export async function updateOne(patientId: string, data: Partial<Omit<Patient, 'id'>>): Promise<Patient> {
  // First fetch the existing resource to merge with
  const existingResponse = await loggedFetch(
    `${FHIR_SERVER_URL}/Patient/${patientId}`,
    { headers: { Accept: 'application/fhir+json' } },
    'Get Patient (for update)',
  );

  if (!existingResponse.ok) {
    throw new Error(`Failed to fetch patient for update: ${existingResponse.status} ${existingResponse.statusText}`);
  }

  const existingResource: FhirPatientResource = await existingResponse.json();

  // Merge updates into the existing resource
  const updates = patientToFhir(data);
  const mergedResource: FhirPatientResource = {
    ...existingResource,
    ...updates,
    resourceType: 'Patient',
    id: patientId,
  };

  const response = await loggedFetch(
    `${FHIR_SERVER_URL}/Patient/${patientId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json',
      },
      body: JSON.stringify(mergedResource),
    },
    'Update Patient',
  );

  if (!response.ok) {
    throw new Error(`Failed to update patient: ${response.status} ${response.statusText}`);
  }

  const updated: FhirPatientResource = await response.json();
  return fhirToPatient(updated);
}

export async function deleteOne(patientId: string): Promise<void> {
  const response = await loggedFetch(
    `${FHIR_SERVER_URL}/Patient/${patientId}`,
    {
      method: 'DELETE',
      headers: { Accept: 'application/fhir+json' },
    },
    'Delete Patient',
  );

  if (!response.ok) {
    throw new Error(`Failed to delete patient: ${response.status} ${response.statusText}`);
  }
}

// Validation follows the [Standard Schema](https://standardschema.dev/).

type ValidationResult = { issues: { message: string; path: (keyof Patient)[] }[] };

export function validate(patient: Partial<Patient>): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  if (!patient.family) {
    issues.push({ message: 'Family name is required', path: ['family'] });
  }

  if (!patient.given) {
    issues.push({ message: 'Given name is required', path: ['given'] });
  }

  if (!patient.gender) {
    issues.push({ message: 'Gender is required', path: ['gender'] });
  } else if (!['male', 'female', 'other', 'unknown'].includes(patient.gender)) {
    issues.push({
      message: 'Gender must be "male", "female", "other" or "unknown"',
      path: ['gender'],
    });
  }

  if (!patient.birthDate) {
    issues.push({ message: 'Birth date is required', path: ['birthDate'] });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(patient.birthDate)) {
    issues.push({ message: 'Birth date must be in YYYY-MM-DD format', path: ['birthDate'] });
  }

  if (!patient.phone) {
    issues.push({ message: 'Phone number is required', path: ['phone'] });
  } else if (!/^[\d\s\-+()]+$/.test(patient.phone)) {
    issues.push({ message: 'Phone number contains invalid characters', path: ['phone'] });
  }

  return { issues };
}
