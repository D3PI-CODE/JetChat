import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from '../pages/register.tsx';
import Login from '../pages/login.tsx';
import NotFound from '../pages/NotFound.tsx';
import { ProtectedRoute } from './protectedRoute.tsx';
import Chat from '../pages/chat.tsx';

export default function AppRouter() {
    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route path="*" element={<NotFound />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/chat" element={<Chat />} />
                </Route>
            </Routes>
        </Router>
    );
}