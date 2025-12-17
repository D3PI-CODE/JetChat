import axios from 'axios';

export const createGroupApi = async ({ groupName, createdBy, token }) => {
  const resp = await axios.post('http://localhost:5002/api/messaging/create-Group', {
            groupName, createdBy 
        }, { headers: {
            Authorization: `Bearer ${token}` 
        } 
    });
  return resp.data;
};

export const addGroupMemberApi = async ({ groupID, memberEmail, memberID, requesterID, token }) => {
    const resp = await axios.post('http://localhost:5002/api/messaging/add-Group-Member', {
            groupID, memberEmail, memberID, requesterID 
        }, { headers: {
            Authorization: `Bearer ${token}` 
        } 
    });
  return resp.data;
};
