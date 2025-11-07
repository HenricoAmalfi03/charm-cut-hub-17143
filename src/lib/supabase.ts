import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://drbqmjmsscqovtsqmszf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYnFtam1zc2Nxb3Z0c3Ftc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MjcyNDUsImV4cCI6MjA3ODEwMzI0NX0.RLfT9b-5y2Q_yQD1oeq0y73seNZxz1WRFqJe8zm1n_A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
