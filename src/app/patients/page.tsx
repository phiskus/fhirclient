'use client';

import { Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import PatientList from '@/components/PatientList';

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <CircularProgress />
    </Box>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PatientList />
    </Suspense>
  );
}
