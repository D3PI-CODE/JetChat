import { io } from '../../index.js';

export const mentionUserInGroup = async (socket: any, data: any): Promise<void> => {
    try {
        const groupID = data && data.groupID;
        const mentionedUserID = data && (data.mentionedID || data.mentionedId || data.mentionedUserID);
        const mentionedEmail = data && (data.mentionedEmail || data.mentioned_email || data.mentioned);
        if (!groupID || (!mentionedUserID && !mentionedEmail)) {
            try { socket.emit('mentionUserInGroupError', { error: 'Missing parameters' }); } catch (e) {}
            return;
        }
        const payload = { groupID, mentionedBy: socket.userID || socket.email };
        // Emit to DB id room if provided
        if (mentionedUserID) {
            try { 
                io.to(String(mentionedUserID)).emit('mentionedInGroup', payload); 
            } catch (e: unknown) { 
                const message = e instanceof Error ? e.message : String(e);
                console.warn('mention emit to id failed', message); 
            }
        }
        // Also emit to email room if provided to cover fallback-auth clients
        if (mentionedEmail) {
            try { 
                io.to(String(mentionedEmail)).emit('mentionedInGroup', payload); 
            } catch (e: unknown) { 
                const message = e instanceof Error ? e.message : String(e);
                console.warn('mention emit to email failed', message); 
            }
        }
        console.log(`Mention emitted for groupID ${groupID} to ${mentionedUserID || mentionedEmail}`);
    } catch (err: unknown) {
        console.error('Error in mentionUserInGroup:', err);
        try { 
            const message = err instanceof Error ? err.message : String(err);
            socket.emit('mentionUserInGroupError', { error: message || 'mentionUserInGroup failed' }); 
        } catch (e) {}
    }
};
