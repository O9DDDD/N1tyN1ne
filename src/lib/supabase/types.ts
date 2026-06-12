// 从 Supabase 生成的数据库类型
// 运行: npx supabase gen types typescript --project-id fjybxoqfatxtgydltvuw > src/lib/supabase/types.ts
// 当前为手动定义的核心表类型

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string; role: 'user' | 'admin' }
        Insert: { id: string; username: string; role?: 'user' | 'admin' }
        Update: { username?: string; role?: 'user' | 'admin' }
        Relationships: never[]
      }
      posts: {
        Row: {
          id: string
          title: string
          content: string
          excerpt: string | null
          tags: string[] | null
          published: boolean
          pinned: boolean
          author_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          excerpt?: string | null
          tags?: string[] | null
          published?: boolean
          pinned?: boolean
          author_id: string
        }
        Update: {
          title?: string
          content?: string
          excerpt?: string | null
          tags?: string[] | null
          published?: boolean
          pinned?: boolean
          updated_at?: string
        }
        Relationships: never[]
      }
      music: {
        Row: {
          id: string
          title: string
          artist: string | null
          album: string | null
          genre: string | null
          album_description: string | null
          album_artist: string | null
          album_year: string | null
          track_number: number | null
          duration: string | null
          audio_url: string
          cover_url: string | null
          lyrics: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          artist?: string | null
          album?: string | null
          genre?: string | null
          album_description?: string | null
          album_artist?: string | null
          album_year?: string | null
          track_number?: number | null
          duration?: string | null
          audio_url: string
          cover_url?: string | null
          lyrics?: string | null
          uploaded_by?: string | null
        }
        Update: {
          title?: string
          artist?: string | null
          album?: string | null
          genre?: string | null
          album_description?: string | null
          album_artist?: string | null
          album_year?: string | null
          track_number?: number | null
          duration?: string | null
          audio_url?: string
          cover_url?: string | null
          lyrics?: string | null
        }
        Relationships: never[]
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
        }
        Update: { content?: string }
        Relationships: never[]
      }
      friends: {
        Row: {
          id: string
          name: string
          url: string
          description: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          description?: string | null
          avatar_url?: string | null
        }
        Update: {
          name?: string
          url?: string
          description?: string | null
          avatar_url?: string | null
        }
        Relationships: never[]
      }
      site_settings: {
        Row: {
          id: number
          hero_title: string | null
          hero_desc: string | null
          about_intro: string | null
          about_title2: string | null
          about_desc2: string | null
          about_title3: string | null
          about_desc3: string | null
        }
        Insert: {
          id?: number
          hero_title?: string | null
          hero_desc?: string | null
          about_intro?: string | null
          about_title2?: string | null
          about_desc2?: string | null
          about_title3?: string | null
          about_desc3?: string | null
        }
        Update: {
          hero_title?: string | null
          hero_desc?: string | null
          about_intro?: string | null
          about_title2?: string | null
          about_desc2?: string | null
          about_title3?: string | null
          about_desc3?: string | null
        }
        Relationships: never[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Profile = Tables<'profiles'>
export type Post = Tables<'posts'>
export type Music = Tables<'music'>
export type Comment = Tables<'comments'>
export type Friend = Tables<'friends'>
export type SiteSettings = Tables<'site_settings'>
