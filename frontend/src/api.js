import axios from 'axios';

// Custom Axios pointing to your backend
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD 
        ? 'https://ai-mock-interview-xnfn.onrender.com' 
        : 'http://localhost:5000'),
    withCredentials: true // Automatically passes HTTP-only cookies like refreshToken
});

// Request Interceptor: Attach accessToken to Authorization header
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Seamlessly refresh expired access token and retry request
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If unauthorized/forbidden and request has not already been retried
        if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403) &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/api/auth/refresh') &&
            !originalRequest.url.includes('/api/auth/logout')
        ) {
            originalRequest._retry = true;

            try {
                // Call refresh endpoint to exchange HTTP-only cookie for a fresh access token
                const refreshResponse = await axios.post(
                    `${api.defaults.baseURL}/api/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const newAccessToken = refreshResponse.data.accessToken;
                if (newAccessToken) {
                    localStorage.setItem('accessToken', newAccessToken);
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh token invalid or expired; log user out cleanly
                localStorage.removeItem('accessToken');
                window.dispatchEvent(new Event('authChange'));
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

