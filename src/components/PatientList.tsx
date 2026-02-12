import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridFilterModel,
  GridPaginationModel,
  GridSortModel,
  GridEventListener,
  gridClasses,
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useSearchParams } from 'next/navigation'
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
  deleteOne as deletePatient,
  getMany as getPatients,
  type Patient,
} from '../data/patients';
import PageContainer from './PageContainer';

const INITIAL_PAGE_SIZE = 10;

export default function PatientList() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const dialogs = useDialogs();
  const notifications = useNotifications();

  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
    pageSize: searchParams.get('pageSize')
      ? Number(searchParams.get('pageSize'))
      : INITIAL_PAGE_SIZE,
  });
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>(
    searchParams.get('filter')
      ? JSON.parse(searchParams.get('filter') ?? '')
      : { items: [] },
  );
  const [sortModel, setSortModel] = React.useState<GridSortModel>(
    searchParams.get('sort') ? JSON.parse(searchParams.get('sort') ?? '') : [],
  );

  // Search state
  const [searchInput, setSearchInput] = React.useState(searchParams.get('search') ?? '');
  const [activeSearch, setActiveSearch] = React.useState(searchParams.get('search') ?? '');

  const [rowsState, setRowsState] = React.useState<{
    rows: Patient[];
    rowCount: number;
  }>({
    rows: [],
    rowCount: 0,
  });

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const handlePaginationModelChange = React.useCallback(
    (model: GridPaginationModel) => {
      setPaginationModel(model);

      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('page', String(model.page));
      newSearchParams.set('pageSize', String(model.pageSize));

      const newSearchParamsString = newSearchParams.toString();

      router.push(
        `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
      );
    },
    [router, pathname, searchParams],
  );

  const handleFilterModelChange = React.useCallback(
    (model: GridFilterModel) => {
      setFilterModel(model);

      const newSearchParams = new URLSearchParams(searchParams.toString());
      if (
        model.items.length > 0 ||
        (model.quickFilterValues && model.quickFilterValues.length > 0)
      ) {
        newSearchParams.set('filter', JSON.stringify(model));
      } else {
        newSearchParams.delete('filter');
      }

      const newSearchParamsString = newSearchParams.toString();

      router.push(
        `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
      );
    },
    [router, pathname, searchParams],
  );

  const handleSortModelChange = React.useCallback(
    (model: GridSortModel) => {
      setSortModel(model);

      const newSearchParams = new URLSearchParams(searchParams.toString());
      if (model.length > 0) {
        newSearchParams.set('sort', JSON.stringify(model));
      } else {
        newSearchParams.delete('sort');
      }

      const newSearchParamsString = newSearchParams.toString();

      router.push(
        `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
      );
    },
    [router, pathname, searchParams],
  );

  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const listData = await getPatients({
        paginationModel,
        sortModel,
        filterModel,
        quickSearch: activeSearch || undefined,
      });

      setRowsState({
        rows: listData.items,
        rowCount: listData.itemCount,
      });
    } catch (listDataError) {
      setError(listDataError as Error);
    }

    setIsLoading(false);
  }, [paginationModel, sortModel, filterModel, activeSearch]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = React.useCallback(() => {
    if (!isLoading) {
      loadData();
    }
  }, [isLoading, loadData]);

  const handleSearch = React.useCallback(() => {
    // Reset to first page when searching
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setActiveSearch(searchInput);

    // Update URL search params
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      newSearchParams.set('search', searchInput.trim());
    } else {
      newSearchParams.delete('search');
    }
    newSearchParams.set('page', '0');
    const newSearchParamsString = newSearchParams.toString();
    router.push(
      `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
    );
  }, [searchInput, searchParams, router, pathname]);

  const handleClearSearch = React.useCallback(() => {
    setSearchInput('');
    setActiveSearch('');
    setPaginationModel((prev) => ({ ...prev, page: 0 }));

    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('search');
    newSearchParams.set('page', '0');
    const newSearchParamsString = newSearchParams.toString();
    router.push(
      `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
    );
  }, [searchParams, router, pathname]);

  const handleSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleRowClick = React.useCallback<GridEventListener<'rowClick'>>(
    ({ row }) => {
      router.push(`/patients/${row.id}`);
    },
    [router],
  );

  const handleCreateClick = React.useCallback(() => {
    router.push('/patients/new');
  }, [router]);

  const handleRowEdit = React.useCallback(
    (patient: Patient) => () => {
      router.push(`/patients/${patient.id}/edit`);
    },
    [router],
  );

  const handleRowDelete = React.useCallback(
    (patient: Patient) => async () => {
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
          await deletePatient(patient.id);

          notifications.show('Patient deleted successfully.', {
            severity: 'success',
            autoHideDuration: 3000,
          });
          loadData();
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
    },
    [dialogs, notifications, loadData],
  );

  const initialState = React.useMemo(
    () => ({
      pagination: { paginationModel: { pageSize: INITIAL_PAGE_SIZE } },
    }),
    [],
  );

  const columns = React.useMemo<GridColDef[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 320 },
      { field: 'name', headerName: 'Name', width: 200 },
      {
        field: 'gender',
        headerName: 'Gender',
        width: 120,
        type: 'singleSelect',
        valueOptions: ['male', 'female', 'other', 'unknown'],
      },
      {
        field: 'birthDate',
        headerName: 'Birth Date',
        width: 140,
      },
      { field: 'phone', headerName: 'Phone', width: 160 },
      {
        field: 'actions',
        type: 'actions',
        flex: 1,
        align: 'right',
        getActions: ({ row }) => [
          <GridActionsCellItem
            key="edit-item"
            icon={<EditIcon />}
            label="Edit"
            onClick={handleRowEdit(row)}
          />,
          <GridActionsCellItem
            key="delete-item"
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleRowDelete(row)}
          />,
        ],
      },
    ],
    [handleRowEdit, handleRowDelete],
  );

  const pageTitle = 'Patients';

  return (
    <PageContainer
      title={pageTitle}
      breadcrumbs={[{ title: pageTitle }]}
      actions={
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </div>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleCreateClick}
            startIcon={<AddIcon />}
          >
            Create
          </Button>
        </Stack>
      }
    >
      <Box sx={{ flex: 1, width: '100%' }}>
        {/* Search bar */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by name or phone number..."
            size="small"
            sx={{ minWidth: 320 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} aria-label="clear search">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Button variant="outlined" onClick={handleSearch} size="small">
            Search
          </Button>
          {activeSearch && (
            <Typography variant="body2" color="text.secondary">
              Showing results for &quot;{activeSearch}&quot;
            </Typography>
          )}
        </Stack>

        {error ? (
          <Box sx={{ flexGrow: 1 }}>
            <Alert severity="error">{error.message}</Alert>
          </Box>
        ) : (
          <DataGrid
            rows={rowsState.rows}
            rowCount={rowsState.rowCount}
            columns={columns}
            pagination
            sortingMode="server"
            filterMode="server"
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={handlePaginationModelChange}
            sortModel={sortModel}
            onSortModelChange={handleSortModelChange}
            filterModel={filterModel}
            onFilterModelChange={handleFilterModelChange}
            disableRowSelectionOnClick
            onRowClick={handleRowClick}
            loading={isLoading}
            initialState={initialState}
            pageSizeOptions={[5, INITIAL_PAGE_SIZE, 25]}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: 'transparent',
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                {
                  outline: 'none',
                },
              [`& .${gridClasses.row}:hover`]: {
                cursor: 'pointer',
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
