import { cld } from "@/config/cloudinary";
import axios from "axios";

export const uploadToCloudinary = async (file, location) => {
    try {
        const uploadPreset = 'ml_default';
        const url = `https://api.cloudinary.com/v1_1/${cld.getConfig().cloud.cloudName}/upload`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        if (location) {
            formData.append('folder', location);
        }

        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};