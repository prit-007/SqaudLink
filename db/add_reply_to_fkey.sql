-- Add foreign key constraint for reply_to_id if it doesn't exist
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_reply_to_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_reply_to_id_fkey 
FOREIGN KEY (reply_to_id) 
REFERENCES public.messages(id) 
ON DELETE SET NULL;
