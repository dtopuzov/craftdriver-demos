import { Navigate } from 'react-router-dom';
import { useMe } from '../hooks/useMe.js';

export function RoleHome() {
  const { data } = useMe();
  return <Navigate to={data?.user.role === 'student' ? '/student' : '/teacher'} replace />;
}
