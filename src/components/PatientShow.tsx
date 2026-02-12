import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
  deleteOne as deletePatient,
  getOne as getPatient,
  type Patient,
} from '../data/patients';
import PageContainer from './PageContainer';

export default function PatientShow() {
  const { id } = useParams();
  const patientId = id as string;
  const router = useRouter();

  const dialogs = useDialogs();
  const notifications = useNotifications();

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

  const handlePatientEdit = React.useCallback(() => {
    router.push(`/patients/${patientId}/edit`);
  }, [router, patientId]);

  const handlePatientDelete = React.useCallback(async () => {
    if (!patient) {
      return;
    }

    const confirmed = await dialogs.confirm(
      `Do you wish to delete ${patient.name}?`,
      {
        title: `Delete patient?`,
        severity: 'error',
        okText: 'Delete',
        cancelText: 'Cancel',
      },
    );

    if (confirmed) {
      setIsLoading(true);
      try {
        await deletePatient(patientId);

        router.push('/patients');

        notifications.show('Patient deleted successfully.', {
          severity: 'success',
          autoHideDuration: 3000,
        });
      } catch (deleteError) {
        notifications.show(
          `Failed to delete patient. Reason: ${(deleteError as Error).message}`,
          {
            severity: 'error',
            autoHideDuration: 3000,
          },
        );
      }
      setIsLoading(false);
    }
  }, [patient, dialogs, patientId, router, notifications]);

  const handleBack = React.useCallback(() => {
    router.push('/patients');
  }, [router]);

  const renderShow = React.useMemo(() => {
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
      <Box sx={{ flexGrow: 1, width: '100%' }}>
        <Grid container spacing={2} sx={{ width: '100%' }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Given Name</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {patient.given || '—'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Family Name</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {patient.family || '—'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Gender</Typography>
              <Typography variant="body1" sx={{ mb: 1, textTransform: 'capitalize' }}>
                {patient.gender || '—'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Birth Date</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {patient.birthDate || '—'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Phone</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {patient.phone || '—'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Patient ID</Typography>
              <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace' }}>
                {patient.id}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back
          </Button>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handlePatientEdit}
            >
              Edit
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handlePatientDelete}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Box>
    ) : null;
  }, [
    isLoading,
    error,
    patient,
    handleBack,
    handlePatientEdit,
    handlePatientDelete,
  ]);

  const pageTitle = patient ? patient.name : `Patient ${patientId}`;

  return (
    <PageContainer
      title={pageTitle}
      breadcrumbs={[
        { title: 'Patients', path: '/patients' },
        { title: pageTitle },
      ]}
    >
      <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>{renderShow}</Box>
    </PageContainer>
  );
}
