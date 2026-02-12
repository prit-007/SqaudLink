'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Box, Container, ImageList, ImageListItem, Typography, Paper } from '@mui/material'
import SquiggleLoader from '@/components/chat/SquiggleLoader'

export default function MediaGallery() {
    const [images, setImages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchMedia = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch conversations I'm in
            const { data: conversations } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', user.id)
            
            if (conversations && conversations.length > 0) {
                const conversationIds = conversations.map(c => c.conversation_id)
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('media_url, created_at, id')
                    .in('conversation_id', conversationIds)
                    .not('media_url', 'is', null)
                    .order('created_at', { ascending: false })
                
                setImages(msgs || [])
            }
            setLoading(false)
        }
        fetchMedia()
    }, [])

    if (loading) return (
        <Box className="flex justify-center items-center h-screen">
            <SquiggleLoader />
        </Box>
    )

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, minHeight: '80vh' }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">Media Gallery</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    All photos shared in your conversations
                </Typography>
                
                {images.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                        <Typography color="text.secondary">No media shared yet.</Typography>
                    </Box>
                ) : (
                    <ImageList variant="masonry" cols={3} gap={8}>
                        {images.map((item) => (
                            <ImageListItem key={item.id}>
                                <img
                                    src={`${item.media_url}`}
                                    alt="Shared media"
                                    loading="lazy"
                                    style={{ borderRadius: 8 }}
                                />
                            </ImageListItem>
                        ))}
                    </ImageList>
                )}
            </Paper>
        </Container>
    )
}
