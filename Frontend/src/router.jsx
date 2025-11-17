import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './register.jsx';
import Login from './login.jsx';
import NotFound from './NotFound.jsx';

export default function AuthAppRouter() {
    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}
