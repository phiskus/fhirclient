import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent, SelectProps } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import dayjs, { Dayjs } from 'dayjs';
import type { Patient } from '../data/patients';

export interface PatientFormState {
  values: Partial<Omit<Patient, 'id' | 'name'>>;
  errors: Partial<Record<keyof PatientFormState['values'], string>>;
}

export type FormFieldValue = string | string[] | number | boolean | File | null;

export interface PatientFormProps {
  formState: PatientFormState;
  onFieldChange: (
    name: keyof PatientFormState['values'],
    value: FormFieldValue,
  ) => void;
  onSubmit: (formValues: Partial<PatientFormState['values']>) => Promise<void>;
  onReset?: (formValues: Partial<PatientFormState['values']>) => void;
  submitButtonLabel: string;
  backButtonPath?: string;
}

export default function PatientForm(props: PatientFormProps) {
  const {
    formState,
    onFieldChange,
    onSubmit,
    onReset,
    submitButtonLabel,
    backButtonPath,
  } = props;

  const formValues = formState.values;
  const formErrors = formState.errors;

 const router = useRouter();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      try {
        await onSubmit(formValues);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, onSubmit],
  );

  const handleTextFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(
        event.target.name as keyof PatientFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleDateFieldChange = React.useCallback(
    (fieldName: keyof PatientFormState['values']) => (value: Dayjs | null) => {
      if (value?.isValid()) {
        onFieldChange(fieldName, value.format('YYYY-MM-DD'));
      } else if (formValues[fieldName]) {
        onFieldChange(fieldName, null);
      }
    },
    [formValues, onFieldChange],
  );

  const handleSelectFieldChange = React.useCallback(
    (event: SelectChangeEvent) => {
      onFieldChange(
        event.target.name as keyof PatientFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleReset = React.useCallback(() => {
    if (onReset) {
      onReset(formValues);
    }
  }, [formValues, onReset]);

  const handleBack = React.useCallback(() => {
    router.push(backButtonPath ?? '/patients');
  }, [router, backButtonPath]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      onReset={handleReset}
      sx={{ width: '100%' }}
    >
      <FormGroup>
        <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.given ?? ''}
              onChange={handleTextFieldChange}
              name="given"
              label="Given Name"
              error={!!formErrors.given}
              helperText={formErrors.given ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.family ?? ''}
              onChange={handleTextFieldChange}
              name="family"
              label="Family Name"
              error={!!formErrors.family}
              helperText={formErrors.family ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <FormControl error={!!formErrors.gender} fullWidth>
              <InputLabel id="patient-gender-label">Gender</InputLabel>
              <Select
                value={formValues.gender ?? ''}
                onChange={handleSelectFieldChange as SelectProps['onChange']}
                labelId="patient-gender-label"
                name="gender"
                label="Gender"
                defaultValue=""
                fullWidth
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
                <MenuItem value="unknown">Unknown</MenuItem>
              </Select>
              <FormHelperText>{formErrors.gender ?? ' '}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={formValues.birthDate ? dayjs(formValues.birthDate) : null}
                onChange={handleDateFieldChange('birthDate')}
                name="birthDate"
                label="Birth Date"
                slotProps={{
                  textField: {
                    error: !!formErrors.birthDate,
                    helperText: formErrors.birthDate ?? ' ',
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.phone ?? ''}
              onChange={handleTextFieldChange}
              name="phone"
              label="Phone"
              error={!!formErrors.phone}
              helperText={formErrors.phone ?? ' '}
              fullWidth
            />
          </Grid>
        </Grid>
      </FormGroup>
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={isSubmitting}
        >
          {submitButtonLabel}
        </Button>
      </Stack>
    </Box>
  );
}
