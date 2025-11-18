import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from '../pages/register.jsx';
import Login from '../pages/login.jsx';
import NotFound from '../pages/NotFound.jsx';
import { ProtectedRoute } from './protectedRoute.jsx';
import Chat from '../pages/chat.jsx';

export default function AppRouter() {
    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/chat" element={<Chat />} />
                </Route>
            </Routes>
        </Router>
    );
}