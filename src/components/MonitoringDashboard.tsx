import * as React from 'react';
import { useSyncExternalStore } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  DataGrid,
  GridColDef,
  gridClasses,
} from '@mui/x-data-grid';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { subscribe, getSnapshot, clearEntries, type ApiLogEntry } from '../data/apiLog';
import PageContainer from './PageContainer';

const METHOD_COLORS: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  DELETE: 'error',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function MonitoringDashboard() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const handleClear = React.useCallback(() => {
    clearEntries();
  }, []);

  const columns = React.useMemo<GridColDef<ApiLogEntry>[]>(
    () => [
      {
        field: 'timestamp',
        headerName: 'Time',
        width: 110,
        valueGetter: (_value, row) => formatTime(row.timestamp),
      },
      {
        field: 'operation',
        headerName: 'Operation',
        width: 180,
      },
      {
        field: 'method',
        headerName: 'Method',
        width: 110,
        renderCell: ({ value }) => (
          <Chip
            label={value}
            color={METHOD_COLORS[value as string] ?? 'default'}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        field: 'url',
        headerName: 'URL',
        flex: 1,
        minWidth: 250,
        renderCell: ({ value }) => (
          <Tooltip title={value as string} placement="bottom-start">
            <Typography variant="body2" noWrap sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {value as string}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 90,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'ok',
        headerName: 'Result',
        width: 110,
        align: 'center',
        headerAlign: 'center',
        renderCell: ({ value }) => (
          <Chip
            label={value ? 'Success' : 'Failed'}
            color={value ? 'success' : 'error'}
            size="small"
          />
        ),
      },
      {
        field: 'duration',
        headerName: 'Duration',
        width: 100,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value) => `${value}ms`,
      },
    ],
    [],
  );

  const pageTitle = 'Monitoring';

  return (
    <PageContainer
      title={pageTitle}
      breadcrumbs={[{ title: pageTitle }]}
      actions={
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteSweepIcon />}
          onClick={handleClear}
          disabled={entries.length === 0}
        >
          Clear Log ({entries.length})
        </Button>
      }
    >
      <Box sx={{ flex: 1, width: '100%' }}>
        {entries.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            No API operations logged yet. Navigate to <strong>Patients</strong> to perform CRUD
            operations — all FHIR API calls will appear here.
          </Alert>
        ) : (
          <DataGrid
            rows={entries}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            getRowClassName={({ row }) => (row.ok ? '' : 'monitoring-row-error')}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: 'transparent',
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                {
                  outline: 'none',
                },
              '& .monitoring-row-error': {
                backgroundColor: 'rgba(211, 47, 47, 0.04)',
              },
            }}
            slotProps={{
              loadingOverlay: {
                variant: 'circular-progress',
                noRowsVariant: 'circular-progress',
              },
              baseIconButton: {
                size: 'small',
              },
            }}
          />
        )}
      </Box>
    </PageContainer>
  );
}
