// The single source of truth for where an account lands after any successful
// auth (login OR registration) and as its "home". Keyed only by role so the
// two flows can never drift apart.
//   student -> Internships (the default browse view)
//   company -> company Dashboard
//   admin   -> admin console
export function roleHome(role) {
  if (role === 'company') return '/company/dashboard';
  if (role === 'admin') return '/admin';
  return '/student/internships';
}
