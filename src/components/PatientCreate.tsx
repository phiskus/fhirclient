import * as React from 'react';
import { useRouter } from 'next/navigation';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
  createOne as createPatient,
  validate as validatePatient,
  type Patient,
} from '../data/patients';
import PatientForm, {
  type FormFieldValue,
  type PatientFormState,
} from './PatientForm';
import PageContainer from './PageContainer';

const INITIAL_FORM_VALUES: Partial<PatientFormState['values']> = {
  gender: 'unknown',
};

export default function PatientCreate() {
  const router = useRouter();

  const notifications = useNotifications();

  const [formState, setFormState] = React.useState<PatientFormState>(() => ({
    values: INITIAL_FORM_VALUES,
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
    setFormValues(INITIAL_FORM_VALUES);
  }, [setFormValues]);

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
      await createPatient(formValues as Omit<Patient, 'id' | 'name'>);
      notifications.show('Patient created successfully.', {
        severity: 'success',
        autoHideDuration: 3000,
      });

      router.push('/patients');
    } catch (createError) {
      notifications.show(
        `Failed to create patient. Reason: ${(createError as Error).message}`,
        {
          severity: 'error',
          autoHideDuration: 3000,
        },
      );
      throw createError;
    }
  }, [formValues, router, notifications, setFormErrors]);

  return (
    <PageContainer
      title="New Patient"
      breadcrumbs={[{ title: 'Patients', path: '/patients' }, { title: 'New' }]}
    >
      <PatientForm
        formState={formState}
        onFieldChange={handleFormFieldChange}
        onSubmit={handleFormSubmit}
        onReset={handleFormReset}
        submitButtonLabel="Create"
      />
    </PageContainer>
  );
}
