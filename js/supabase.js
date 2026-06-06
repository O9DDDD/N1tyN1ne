const SUPABASE_URL = 'https://fjybxoqfatxtgydltvuw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeWJ4b3FmYXR4dGd5ZGx0dnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTU0OTUsImV4cCI6MjA5NjMzMTQ5NX0.RYrmm6wbfJASH8zMqOJgrZyVRSb_MT4b84pQtbDPLVo';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// File upload helper
async function uploadFile(bucket, file, path) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

// Get public URL for stored file
function getFileUrl(bucket, path) {
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
