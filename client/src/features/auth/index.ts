// Server composition roots consume this barrel; client internals import colocated hooks/actions directly.
export { loadMessages as authMessages } from './components/AuthForm/messages';
export { AuthGate } from './components/AuthGate/AuthGate.server';
export { authMetadata, AuthRoute } from './components/AuthRoute/AuthRoute.server';
export { AuthShell } from './components/AuthShell/AuthShell.server';
export { LogoutButton } from './components/LogoutButton';
export { ProtectedPage } from './components/ProtectedPage/ProtectedPage.server';
