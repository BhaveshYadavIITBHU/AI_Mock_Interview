import axios from 'axios';

// Custom Axios pointing to your backend
const api = axios.create({
    baseURL : import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
});

// INterceptor : This runs automatically before every request
api.interceptors.request.use((config)=>{
    const token = localStorage.getItem('accessToken');

    //If we have token attatch it to the Authorization Header
    if(token){
        config.headers.Authorization=`Bearer ${token}`;
    }

    return config;
},(error)=>{
   return Promise.reject(error);
});

export default api;
