const FormatName = (name: string | undefined, role?: 'student' | 'faculty'): string => {
  if (!name && role === 'faculty') 
    return 'TBA';
  if (!name)
    return 'User';

  return name
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default FormatName;