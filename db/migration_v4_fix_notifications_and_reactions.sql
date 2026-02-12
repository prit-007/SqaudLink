-- Fix notification trigger for JSONB content
CREATE OR REPLACE FUNCTION queue_message_notification()
RETURNS trigger AS $$
DECLARE
  sender_username text;
  conversation_type text;
  recipient_ids uuid[];
  message_body text;
BEGIN
  -- Get sender username
  SELECT username INTO sender_username
  FROM public.profiles
  WHERE id = new.sender_id;

  -- Get conversation type
  SELECT type INTO conversation_type
  FROM public.conversations
  WHERE id = new.conversation_id;

  -- Get all recipients except sender
  SELECT array_agg(user_id) INTO recipient_ids
  FROM public.conversation_participants
  WHERE conversation_id = new.conversation_id
    AND user_id != new.sender_id;

  -- Determine message body for notification
  IF new.message_type = 'text' THEN
    -- Check if content is a JSON string (legacy/plaintext) or object (encrypted)
    IF jsonb_typeof(new.content) = 'string' THEN
       message_body := left(new.content#>>'{}', 100);
    ELSE
       -- It's likely an object (encrypted) or other structure
       message_body := '🔒 Encrypted Message';
    END IF;
  ELSIF new.message_type = 'image' THEN
    message_body := '📷 Photo';
  ELSE
    message_body := 'New message';
  END IF;

  -- Queue notifications for each recipient
  INSERT INTO public.notification_queue (user_id, message_id, notification_type, title, body, data)
  SELECT 
    unnest(recipient_ids),
    new.id,
    'message',
    CASE 
      WHEN conversation_type = 'dm' THEN sender_username
      WHEN conversation_type = 'group' THEN (SELECT name FROM public.conversations WHERE id = new.conversation_id)
    END,
    message_body,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'sender_id', new.sender_id,
      'message_type', new.message_type
    );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for toggling reactions (avoids 406 errors with special chars in URL)
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_message_id uuid,
  p_emoji text
)
RETURNS void AS $$
DECLARE
  v_existing_id uuid;
BEGIN
  -- Check if reaction exists for this user
  SELECT id INTO v_existing_id
  FROM public.message_reactions
  WHERE message_id = p_message_id
    AND user_id = auth.uid()
    AND emoji = p_emoji;

  IF v_existing_id IS NOT NULL THEN
    -- Delete existing
    DELETE FROM public.message_reactions WHERE id = v_existing_id;
  ELSE
    -- Insert new
    INSERT INTO public.message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, auth.uid(), p_emoji);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
