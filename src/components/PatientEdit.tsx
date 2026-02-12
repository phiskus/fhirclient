import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
  getOne as getPatient,
  updateOne as updatePatient,
  validate as validatePatient,
  type Patient,
} from '../data/patients';
import PatientForm, {
  type FormFieldValue,
  type PatientFormState,
} from './PatientForm';
import PageContainer from './PageContainer';

function PatientEditForm({
  initialValues,
  onSubmit,
}: {
  initialValues: Partial<PatientFormState['values']>;
  onSubmit: (formValues: Partial<PatientFormState['values']>) => Promise<void>;
}) {
  const { id } = useParams();
  const patientId = id as string;
  const router = useRouter();

  const notifications = useNotifications();

  const [formState, setFormState] = React.useState<PatientFormState>(() => ({
    values: initialValues,
    errors: {},
  }));
  const formValues = formState.values;
  const formErrors = formState.errors;

  const setFormValues = React.useCallback(
    (newFormValues: Partial<PatientFormState['values']>) => {
      setFormState((previousState) => ({
        ...previousState,
        values: newFormValues,
      }));
    },
    [],
  );

  const setFormErrors = React.useCallback(
    (newFormErrors: Partial<PatientFormState['errors']>) => {
      setFormState((previousState) => ({
        ...previousState,
        errors: newFormErrors,
      }));
    },
    [],
  );

  const handleFormFieldChange = React.useCallback(
    (name: keyof PatientFormState['values'], value: FormFieldValue) => {
      const validateField = async (values: Partial<PatientFormState['values']>) => {
        const { issues } = validatePatient(values);
        setFormErrors({
          ...formErrors,
          [name]: issues?.find((issue) => issue.path?.[0] === name)?.message,
        });
      };

      const newFormValues = { ...formValues, [name]: value };

      setFormValues(newFormValues);
      validateField(newFormValues);
    },
    [formValues, formErrors, setFormErrors, setFormValues],
  );

  const handleFormReset = React.useCallback(() => {
    setFormValues(initialValues);
  }, [initialValues, setFormValues]);

  const handleFormSubmit = React.useCallback(async () => {
    const { issues } = validatePatient(formValues);
    if (issues && issues.length > 0) {
      setFormErrors(
        Object.fromEntries(issues.map((issue) => [issue.path?.[0], issue.message])),
      );
      return;
    }
    setFormErrors({});

    try {
      await onSubmit(formValues);
      notifications.show('Patient edited successfully.', {
        severity: 'success',
        autoHideDuration: 3000,
      });

      router.push('/patients');
    } catch (editError) {
      notifications.show(
        `Failed to edit patient. Reason: ${(editError as Error).message}`,
        {
          severity: 'error',
          autoHideDuration: 3000,
        },
      );
      throw editError;
    }
  }, [formValues, router, notifications, onSubmit, setFormErrors]);

  return (
    <PatientForm
      formState={formState}
      onFieldChange={handleFormFieldChange}
      onSubmit={handleFormSubmit}
      onReset={handleFormReset}
      submitButtonLabel="Save"
      backButtonPath={`/patients/${patientId}`}
    />
  );
}

export default function PatientEdit() {
  const { id } = useParams();
  const patientId = id as string;

  const [patient, setPatient] = React.useState<Patient | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const showData = await getPatient(patientId);

      setPatient(showData);
    } catch (showDataError) {
      setError(showDataError as Error);
    }
    setIsLoading(false);
  }, [patientId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = React.useCallback(
    async (formValues: Partial<PatientFormState['values']>) => {
      const updatedData = await updatePatient(patientId, formValues);
      setPatient(updatedData);
    },
    [patientId],
  );

  const renderEdit = React.useMemo(() => {
    if (isLoading) {
      return (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            m: 1,
          }}
        >
          <CircularProgress />
        </Box>
      );
    }
    if (error) {
      return (
        <Box sx={{ flexGrow: 1 }}>
          <Alert severity="error">{error.message}</Alert>
        </Box>
      );
    }

    return patient ? (
      <PatientEditForm initialValues={patient} onSubmit={handleSubmit} />
    ) : null;
  }, [isLoading, error, patient, handleSubmit]);

  return (
    <PageContainer
      title={`Edit Patient`}
      breadcrumbs={[
        { title: 'Patients', path: '/patients' },
        { title: patient?.name ?? `Patient ${patientId}`, path: `/patients/${patientId}` },
        { title: 'Edit' },
      ]}
    >
      <Box sx={{ display: 'flex', flex: 1 }}>{renderEdit}</Box>
    </PageContainer>
  );
}
