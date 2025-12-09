import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import DataGrid from './components/DataGrid';
import Dashboard from './components/Dashboard';
import SqlEditor from './pages/SqlEditor';
import SchemaVisualizer from './pages/SchemaVisualizer';
import { ConnectionProvider } from './context/ConnectionContext';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        }
    }
});

function TableRoute() {
    const { tableName } = useParams<{ tableName: string }>();
    return <DataGrid tableName={tableName!} key={tableName} />;
}

function App() {
    return (
        <ConnectionProvider>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<AppLayout />}>
                            <Route index element={<Dashboard />} />

                            <Route path="table/:tableName" element={<TableRoute />} />

                            <Route path="sql" element={<SqlEditor />} />

                            <Route path="schema" element={<SchemaVisualizer />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </QueryClientProvider>
        </ConnectionProvider>
    );
}

export default App;
