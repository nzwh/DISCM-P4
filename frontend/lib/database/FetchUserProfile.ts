import { supabase } from "../supabase";
import { Profile } from "../types";

const FetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return new Profile(data);
}

export default FetchUserProfile;