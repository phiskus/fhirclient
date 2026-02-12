'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NotificationsProvider from '@/hooks/useNotifications/NotificationsProvider';
import DialogsProvider from '@/hooks/useDialogs/DialogsProvider';
import {
  dataGridCustomizations,
  datePickersCustomizations,
  sidebarCustomizations,
  formInputCustomizations,
} from '@/theme/customizations';
import { colorSchemes, typography, shadows, shape } from '@/shared-theme/themePrimitives';

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-mui-color-scheme',
  },
  colorSchemes,
  typography,
  shadows,
  shape,
  components: {
    ...dataGridCustomizations,
    ...datePickersCustomizations,
    ...sidebarCustomizations,
    ...formInputCustomizations,
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-mui-color-scheme="light">
      <body style={{ margin: 0, height: '100vh' }}>
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          <NotificationsProvider>
            <DialogsProvider>
              {children}
            </DialogsProvider>
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
