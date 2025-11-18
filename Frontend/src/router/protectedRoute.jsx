import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import axios from 'axios';

export const ProtectedRoute = () => {
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;

        const validate = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/auth/validate-token', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                // only navigate if component still mounted
                if (!mounted) return;

                // debug logs to diagnose unexpected redirects
                console.debug('validate-token response:', response && response.data);
                console.debug('token used for validation:', token?.slice ? token.slice(0, 10) + '...' : token);

                // accept boolean true or string 'true' from server
                const valid = response && response.data && response.data.valid;
                if (!(valid === true || String(valid) === 'true')) {
                    // Not valid -> redirect
                    navigate('/login');
                }
            } catch (error) {
                console.error('Token validation failed:', error);
                if (mounted) navigate('/login');
            }
        };

        validate();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    return <Outlet />;
};