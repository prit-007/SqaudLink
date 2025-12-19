-- ============================================
-- Enable End-to-End Encryption (E2EE) Support
-- Run this file to add E2EE tables to your database
-- ============================================

-- 1. Create user_devices table for storing device public keys
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, device_fingerprint)
);

-- 2. Create message_device_keys table for storing encrypted message keys per device
CREATE TABLE IF NOT EXISTS public.message_device_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.user_devices(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, device_id)
);

-- 3. Create e2ee_pre_keys table for Signal-style pre-keys (optional, for future use)
CREATE TABLE IF NOT EXISTS public.e2ee_pre_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.user_devices(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(device_id, key_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_device_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e2ee_pre_keys ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_devices
CREATE POLICY "Users can view all devices in their conversations"
    ON public.user_devices FOR SELECT
    USING (
        user_id = auth.uid()
        OR user_id IN (
            SELECT DISTINCT cp2.user_id
            FROM conversation_participants cp1
            JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own devices"
    ON public.user_devices FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices"
    ON public.user_devices FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own devices"
    ON public.user_devices FOR DELETE
    USING (user_id = auth.uid());

-- 6. RLS Policies for message_device_keys
CREATE POLICY "Users can view message keys for their devices"
    ON public.message_device_keys FOR SELECT
    USING (
        device_id IN (
            SELECT id FROM user_devices WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert message device keys"
    ON public.message_device_keys FOR INSERT
    WITH CHECK (true);

-- 7. RLS Policies for e2ee_pre_keys
CREATE POLICY "Users can view pre-keys for devices in their conversations"
    ON public.e2ee_pre_keys FOR SELECT
    USING (
        device_id IN (
            SELECT ud.id
            FROM user_devices ud
            WHERE ud.user_id IN (
                SELECT DISTINCT cp2.user_id
                FROM conversation_participants cp1
                JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
                WHERE cp1.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert pre-keys for their own devices"
    ON public.e2ee_pre_keys FOR INSERT
    WITH CHECK (
        device_id IN (
            SELECT id FROM user_devices WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update pre-keys for their own devices"
    ON public.e2ee_pre_keys FOR UPDATE
    USING (
        device_id IN (
            SELECT id FROM user_devices WHERE user_id = auth.uid()
        )
    );

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON public.user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_message_device_keys_message_id ON public.message_device_keys(message_id);
CREATE INDEX IF NOT EXISTS idx_message_device_keys_device_id ON public.message_device_keys(device_id);
CREATE INDEX IF NOT EXISTS idx_e2ee_pre_keys_device_id ON public.e2ee_pre_keys(device_id);

-- 9. Create helper function to get active devices for a user
CREATE OR REPLACE FUNCTION get_active_user_devices(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    device_name TEXT,
    device_fingerprint TEXT,
    public_key TEXT,
    last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ud.id,
        ud.device_name,
        ud.device_fingerprint,
        ud.public_key,
        ud.last_seen_at
    FROM user_devices ud
    WHERE ud.user_id = target_user_id
      AND ud.is_active = true
    ORDER BY ud.last_seen_at DESC;
END;
$$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ E2EE tables created successfully!';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 End-to-End Encryption is now enabled!';
    RAISE NOTICE '⚠️  Please restart your app for changes to take effect.';
END $$;
