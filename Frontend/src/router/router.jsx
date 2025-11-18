import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from '../pages/register.jsx';
import Login from '../pages/login.jsx';
import NotFound from '../pages/NotFound.jsx';
import { ProtectedRoute } from './protectedRoute.jsx';

export default function AppRouter() {
    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/chat" element={<div>Chat Component Placeholder</div>} />
                </Route>
            </Routes>
        </Router>
    );
}