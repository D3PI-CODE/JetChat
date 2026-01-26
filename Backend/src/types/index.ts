// DTO (Data Transfer Object) types for Backend services

export interface GroupDTO {
  groupID?: string;
  memberID?: string;
  requesterID?: string;
  memberEmail?: string;
  newRole?: string;
  imageUrl?: string;
  newGroupName?: string;
  requesterId?: string;
  groupName?: string;
  createdBy?: string;
}

export interface UserDTO {
  from?: string;
  to?: string;
  groupID?: string;
  fromEmail?: string;
  toEmail?: string;
  imageUrl?: string;
  requesterID?: string;
}

export interface ServiceResponse {
  success?: boolean;
  error?: string;
  details?: string;
  message?: string;
  member?: any;
  messages?: any[];
}
