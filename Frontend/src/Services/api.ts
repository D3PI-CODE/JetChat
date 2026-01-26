import axios from 'axios';

const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
});

export const createGroupApi = async ({ groupName, createdBy, token }: { groupName: string; createdBy: string; token: string }) => {
  const resp = await axios.post('http://localhost:5002/api/messaging/create-Group', {
            groupName, createdBy 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
};

export const addGroupMemberApi = async ({ groupID, memberEmail, memberID, requesterID, token }: { groupID: string; memberEmail: string; memberID: string; requesterID: string; token: string }) => {
    const resp = await axios.post('http://localhost:5002/api/messaging/add-Group-Member', {
            groupID, memberEmail, memberID, requesterID 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
};

export const removeGroupMemberApi = async ({ groupID, memberID, requesterID, token }: { groupID: string; memberID: string; requesterID: string; token: string }) => {
  const resp = await axios.delete('http://localhost:5002/api/messaging/remove-Group-Member', {
      data: { groupID, memberID, requesterID },
      headers: authHeaders(token)
  });
  return resp.data;
}

export const leaveGroupApi = async ({ groupID, requesterID, token }: { groupID: string; requesterID: string; token: string }) => {
  const resp = await axios.delete('http://localhost:5002/api/messaging/leave-group', {
      data: { groupID, requesterID },
      headers: authHeaders(token)
  });
  return resp.data;
} 

export const deleteGroupApi = async ({ groupID, requesterId, token }: { groupID: string; requesterId: string; token: string }) => {
  const resp = await axios.delete('http://localhost:5002/api/messaging/delete-Group', {
      data: { groupID, requesterId },
      headers: authHeaders(token)
  });
  return resp.data;
}

export const getMessagesApi = async ({ from, to, groupID,fromEmail,toEmail, token }: { from: string; to: string; groupID?: string; fromEmail: string; toEmail: string; token: string }) => {
    const resp = await axios.get('http://localhost:5002/api/messaging/get-messages', {
        params: { from, to, groupID, fromEmail, toEmail },
        headers: authHeaders(token)
    });
    return resp.data;
}

export const renameGroupApi = async ({ groupID, newGroupName, requesterID, token }: { groupID: string; newGroupName: string; requesterID: string; token: string }) => {
  const resp = await axios.patch('http://localhost:5002/api/messaging/rename-Group', {
            groupID, newGroupName, requesterID 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
}

export const changeGroupMemberRole = async ({ groupID, memberID, newRole, requesterID, token }: { groupID: string; memberID: string; newRole: string; requesterID: string; token: string }) => {
  const resp = await axios.patch('http://localhost:5002/api/messaging/change-Group-Member-Role', {
            groupID, memberID, newRole, requesterID 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
}

export const changeProfilePicApi = async ({ imageUrl, requesterID, token }: { imageUrl: string; requesterID: string; token: string }) => {
  const resp = await axios.patch('http://localhost:5002/api/messaging/change-Profile', {
            imageUrl, requesterID 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
}

export const changeGroupAvatarApi = async ({ groupID, imageUrl, requesterID, token }: { groupID: string; imageUrl: string; requesterID: string; token: string }) => {
  const resp = await axios.patch('http://localhost:5002/api/messaging/change-Group-Avatar', {
            groupID, imageUrl, requesterID 
        }, { headers: authHeaders(token) 
    });
  return resp.data;
}