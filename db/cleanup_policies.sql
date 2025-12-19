-- =============================================
-- 🧹 CLEANUP: Remove Problematic RLS Policies
-- =============================================
-- Run this FIRST if you already ran the old rls_fix_conversations.sql
-- This removes policies that cause infinite recursion errors

-- Drop old policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON public.conversation_participants;

-- Now run rls_fix_conversations.sql to apply the corrected policies
