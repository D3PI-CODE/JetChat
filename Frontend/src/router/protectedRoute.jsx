import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const ProtectedRoute = () => {
    const [isValid, setIsValid] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isValid) {
            return navigate("/login");
        }
    }, [isValid, navigate]);

    return <Outlet />;
};