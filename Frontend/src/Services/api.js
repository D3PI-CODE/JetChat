import axios from 'axios';

const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
});

export const createGroupApi = async ({ groupName, createdBy, token }) => {
  const resp = await axios.post('http://localhost:5002/api/messaging/create-Group', {
            groupName, createdBy 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
};

export const addGroupMemberApi = async ({ groupID, memberEmail, memberID, requesterID, token }) => {
    const resp = await axios.post('http://localhost:5002/api/messaging/add-Group-Member', {
            groupID, memberEmail, memberID, requesterID 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
};

export const removeGroupMemberApi = async ({ groupID, memberID, requesterID, token }) => {
  const resp = await axios.delete('http://localhost:5002/api/messaging/remove-Group-Member', {
      data: { groupID, memberID, requesterID },
      headers: authHeaders(token)
  });
  return resp.data;
}

export const leaveGroupApi = async ({ groupID, requesterID, token }) => {
  const resp = await axios.delete('http://localhost:5002/api/messaging/leave-group', {
      data: { groupID, requesterID },
      headers: authHeaders(token)
  });
  return resp.data;
} 

export const deleteGroupApi = async ({ groupID, requesterId, token }) => {
  const resp = await axios.delete('http://localhost:5002/api/messaging/delete-Group', {
      data: { groupID, requesterId },
      headers: authHeaders(token)
  });
  return resp.data;
}