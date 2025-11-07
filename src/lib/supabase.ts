import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://drbqmjmsscqovtsqmszf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdGVlYWl6bmh4bWJtZnRpdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NzY0MjIsImV4cCI6MjA3ODA1MjQyMn0.9GKjRn2sslWFsHARE_XuRnFfC9UApe-WpwrBQ9kTdd4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
